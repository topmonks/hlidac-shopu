import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { createShop, getShopName, ShopError, ShopParams } from "../shops";
import { notFound, response, withCORS } from "../utils";
import {
  getHistoricalData,
  getMetadata,
  getParsedData,
  putParsedData
} from "../product-detail";
import {
  DataRow,
  getClaimedDiscount,
  getRealDiscount,
  prepareData
} from "../discount";

function createDataset(data: DataRow[]) {
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

export async function handler(event: Request): Promise<Response> {
  try {
    const params = (<unknown>(event.queryStringParameters || {})) as ShopParams;
    if (!params.url) {
      return withCORS(["GET", "OPTIONS"])({
        statusCode: 400,
        body: JSON.stringify({ error: "Missing url parameter" })
      });
    }

    const shop = createShop(params);
    if (!shop) {
      return withCORS(["GET", "OPTIONS"])(
        notFound({ error: "Unsupported shop", shop: getShopName(params) })
      );
    }

    const db = new aws.sdk.DynamoDB.DocumentClient();

    let itemId = params.itemId ?? shop.itemId;
    if (params.currentPrice && params.currentPrice !== "null") {
      // store parsed data by extension
      putParsedData(db, shop, params).catch(err =>
        console.error("ERROR: " + err)
      );
    }
    const extraData = getParsedData(db, shop);
    const meta = getMetadata(db, shop.name, <string>shop.itemUrl, itemId);

    itemId = itemId ?? (await meta)?.itemId;
    if (!itemId) {
      return withCORS(["GET", "OPTIONS"])(
        notFound({ error: "Unknown item", itemId })
      );
    }
    const item = await getHistoricalData(db, shop.name, itemId);
    if (!item) {
      return withCORS(["GET", "OPTIONS"])(
        notFound({ error: "Missing data", itemId })
      );
    }

    const rows = prepareData(item);
    const { currentPrice, originalPrice, imageUrl } = Object.assign(
      {},
      await extraData,
      params.currentPrice
        ? {
            currentPrice: parseFloat(params.currentPrice),
            originalPrice:
              params.originalPrice == null
                ? null
                : parseFloat(params.originalPrice),
            imageUrl: params.imageUrl
          }
        : {}
    );
    if (currentPrice)
      rows.push({ currentPrice, originalPrice, date: new Date() });

    const discount = getRealDiscount(rows);
    const transformMetadata = ({
      itemImage,
      itemName,
      real_sale,
      max_price,
      ...rest
    }: any) => ({
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
  } catch (error) {
    if (error instanceof ShopError) {
      const { message } = error;
      return withCORS(["GET", "OPTIONS"])(
        notFound({ data: [], metadata: { "error": message } })
      );
    } else {
      throw error;
    }
  }
}
