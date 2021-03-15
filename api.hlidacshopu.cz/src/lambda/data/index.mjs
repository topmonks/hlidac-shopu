import { DynamoDBClient } from "@aws-sdk/client-dynamodb/dist/es/DynamoDBClient.js";
import { S3Client } from "@aws-sdk/client-s3/dist/es/S3Client.js";
import { GetObjectCommand } from "@aws-sdk/client-s3/dist/es/commands/GetObjectCommand.js";
import { shopHost, parseItemDetails } from "@hlidac-shopu/lib/shops.mjs";
import { notFound, response, withCORS } from "../http.mjs";
import {
  getHistoricalData,
  getParsedData,
  putParsedData
} from "../product-detail.mjs";
import {
  getClaimedDiscount,
  getRealDiscount,
  prepareData
} from "../discount.mjs";

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

  data.forEach((item, i) => {
    originalPrice[i] = {
      x: item.date,
      y: item?.originalPrice
    };
    currentPrice[i] = {
      x: item.date,
      y: item?.currentPrice
    };
  });

  return { originalPrice, currentPrice };
}

const db = new DynamoDBClient({});
const s3 = new S3Client({ region: "eu-central-1" });

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
    return withCORS(["GET", "OPTIONS"])(
      notFound({ error: "Unsupported shop", shop: shopHost(params) })
    );
  }

  let itemId = params.itemId ?? shop.itemId;
  if (params.currentPrice && params.currentPrice !== "null") {
    // store parsed data by extension
    putParsedData(db, shop, params).catch(err =>
      console.error("ERROR: " + err)
    );
  }
  const extraData = getParsedData(db, shop);

  const getDataKey = (shop, itemUrl, itemId) =>
    `detail/${shop}/${itemId ?? itemUrl}`;

  const data = await s3.send(
    new GetObjectCommand({
      Bucket: "data.hlidacshopu.cz",
      Key: getDataKey(shop.key, shop.itemUrl, itemId)
    })
  );

  console.log(data.Body);

  itemId = itemId ?? data?.itemId;
  if (!itemId) {
    return withCORS(["GET", "OPTIONS"])(
      notFound({ error: "Unknown item", itemId })
    );
  }
  if (!data) {
    return withCORS(["GET", "OPTIONS"])(
      notFound({ error: "Missing data", itemId })
    );
  }

  const rows = prepareData(data.history);
  const { currentPrice, originalPrice, imageUrl } = Object.assign(
    {},
    await extraData,
    params.currentPrice
      ? {
          currentPrice: parseFloat(params.currentPrice),
          originalPrice: params.originalPrice
            ? parseFloat(params.originalPrice)
            : null,
          imageUrl: params.imageUrl
        }
      : {}
  );
  if (currentPrice) {
    rows.push({ currentPrice, originalPrice, date: new Date() });
  }

  const discount = getRealDiscount(rows);
  const transformMetadata = ({
    itemImage,
    itemName,
    real_sale,
    max_price,
    ...rest
  }) => ({
    name: itemName,
    imageUrl: itemImage === "null" ? imageUrl : itemImage,
    claimedDiscount: getClaimedDiscount(rows),
    ...discount,
    ...rest
  });
  return withCORS(["GET", "OPTIONS"])(
    response(
      {
        data: createDataset(rows),
        metadata: meta ? transformMetadata((await meta) ?? {}) : null
      },
      { "Cache-Control": "max-age=3600" }
    )
  );
}
