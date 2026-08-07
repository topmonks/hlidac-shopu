import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { UTCDate } from "@date-fns/utc";
import { parseItemDetails, shopHost } from "@hlidac-shopu/lib/shops.mjs";
import { getClaimedDiscount, prepareData, realDiscount } from "../discount.mjs";
import { notFound, response, withCORS } from "../http.mjs";
import {
  getHistoricalDataFromS3,
  getMetadataFromS3,
  getParsedData,
  incHitCounter,
  putParsedData
} from "../product-detail.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */
/** @typedef { import("@hlidac-shopu/lib/shops.mjs").ShopParams } ShopParams */
/** @typedef { import("../discount.mjs").DataRow } DataRow */

/**
 * @param {DataRow[]} data
 */
function createDataset(data) {
  const originalPrice = new Array(data.length);
  const currentPrice = new Array(data.length);

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    originalPrice[i] = {
      x: item.date,
      y: item.originalPrice
    };
    currentPrice[i] = {
      x: item.date,
      y: item.currentPrice
    };
  }

  return { originalPrice, currentPrice };
}

const db = new DynamoDBClient({});
const s3 = new S3Client({});

const dmCountry = new Map([
  ["dm_cz", "cz"],
  ["dm_sk", "sk"]
]);
const dmGtinCache = new Map();

/**
 * DM's historical data is keyed by GTIN (the id in legacy `-p<gtin>.html`
 * URLs), but current `/p/d/<dan>/<slug>` URLs carry their internal "dan"
 * instead. Resolve dan → GTIN: prefer the GTIN scraped by the extension
 * from the page's JSON-LD (`itemId` param), fall back to DM's product
 * search API.
 * @param {ShopParams} params
 * @param {string} shopKey
 * @returns {Promise<string | null>} GTIN or null when not resolvable
 */
async function resolveDmGtin(params, shopKey) {
  const dan = new URL(params.url).pathname.match(/^\/p\/d\/(\d+)(?:\/|$)/)?.[1];
  if (!dan) return null; // legacy URL, itemId already is the GTIN
  if (params.itemId && params.itemId !== dan) return params.itemId;
  if (dmGtinCache.has(dan)) return dmGtinCache.get(dan);
  const country = dmCountry.get(shopKey);
  const query = new URLSearchParams({
    query: dan,
    type: "search-static",
    pageSize: "10",
    currentPage: "0"
  });
  const resp = await fetch(`https://product-search.services.dmtech.com/${country}/search/crawl?${query}`);
  if (!resp.ok) return null;
  const { products } = await resp.json();
  const gtin = products?.find(p => String(p.dan) === dan)?.gtin?.toString() ?? null;
  if (gtin) dmGtinCache.set(dan, gtin);
  return gtin;
}

function scrapedData(params) {
  return params.currentPrice
    ? {
        currentPrice: parseFloat(params.currentPrice),
        originalPrice: params.originalPrice ? parseFloat(params.originalPrice) : null,
        imageUrl: params.imageUrl
      }
    : {};
}

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  /** @type {ShopParams | null} */
  const params = event.queryStringParameters;
  if (!params?.url) {
    return withCORS(["GET", "OPTIONS"])({
      statusCode: 400,
      body: JSON.stringify({ error: "Missing url parameter" })
    });
  }

  const shop = parseItemDetails(params.url);
  if (!shop) {
    return withCORS(["GET", "OPTIONS"])(notFound({ error: "Unsupported shop", shop: shopHost(params) }));
  }

  let slug = shop.itemId ?? shop.itemUrl;
  if (!slug) {
    return withCORS(["GET", "OPTIONS"])(
      notFound({
        error: "Missing slug",
        shop
      })
    );
  }

  if (dmCountry.has(shop.key)) {
    const gtin = await resolveDmGtin(params, shop.key).catch(err => {
      console.error("ERROR: dan→gtin resolution failed: " + err);
      return null;
    });
    if (gtin) {
      slug = gtin;
      shop.itemId = gtin;
      shop.itemUrl = gtin;
    }
  }
  console.log("slug", slug);

  if (params.currentPrice && params.currentPrice !== "null") {
    // store parsed data by extension
    putParsedData(db, shop, params).catch(err => console.error("ERROR: " + err));
  }

  try {
    const now = Date.now();
    console.time(`data fetching ${now}`);
    const [meta, priceHistory, extraData] = await Promise.all([
      getMetadataFromS3(s3, shop.origin, slug),
      getHistoricalDataFromS3(s3, shop.origin, slug),
      getParsedData(db, shop)
    ]);
    console.timeEnd(`data fetching ${now}`);

    if (!meta) {
      return withCORS(["GET", "OPTIONS"])(
        notFound({
          error: "Missing metadata",
          shop: shop.origin,
          itemUrl: shop.itemUrl
        })
      );
    }
    if (!priceHistory) {
      return withCORS(["GET", "OPTIONS"])(
        notFound({
          error: "Missing price history",
          shop: shop.origin,
          itemUrl: shop.itemUrl
        })
      );
    }

    incHitCounter(db, shop.origin).catch(err => console.error("ERROR:", err));

    console.time("data preparation");
    const len = params?.history === "full" ? null : 365;
    const rows = prepareData(priceHistory, len);
    const { currentPrice, originalPrice, imageUrl } = Object.assign({}, extraData, scrapedData(params));
    if (currentPrice) {
      rows.push({ currentPrice, originalPrice, date: new UTCDate() });
    }
    console.timeEnd("data preparation");

    console.time("discount computation");
    const discount = realDiscount(priceHistory?.commonPrice ? priceHistory : meta, rows);
    const claimedDiscount = getClaimedDiscount(rows);
    const transformMetadata = ({ itemImage, itemName, ...rest }) => ({
      name: itemName,
      imageUrl: itemImage ?? imageUrl,
      claimedDiscount,
      ...discount,
      ...rest
    });
    console.timeEnd("discount computation");
    return withCORS(["GET", "OPTIONS"])(
      response(
        {
          data: createDataset(rows),
          metadata: meta ? transformMetadata(meta) : null
        },
        { "Cache-Control": "max-age=3600" }
      )
    );
  } catch (err) {
    console.error(err);
    if (err?.$metadata?.httpStatusCode === 404) {
      return withCORS(["GET", "OPTIONS"])(notFound());
    } else {
      return withCORS(["GET", "OPTIONS"])({
        statusCode: 500,
        body: ""
      });
    }
  }
}
