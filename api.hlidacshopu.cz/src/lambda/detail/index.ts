import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { createShop, ShopError, ShopParams } from "../shops";
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
  parseData
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

    const db = new aws.sdk.DynamoDB.DocumentClient();
    const shop = createShop(params);
    if (!shop) {
      return withCORS(["GET", "OPTIONS"])(notFound());
    }

    let itemId = params.itemId ?? shop.itemId;
    let extraData, imageUrl: string;
    if (params.currentPrice && params.currentPrice !== "null") {
      // store parsed data by extension
      putParsedData(db, shop, params).catch(err => console.error(err));
    } else {
      // send parsed data to PWA
      extraData = getParsedData(db, shop);
    }
    const meta = getMetadata(db, shop.name, <string>shop.itemUrl, itemId);

    itemId = itemId ?? (await meta)?.itemId;
    const item = await getHistoricalData(db, shop.name, itemId ?? "");
    if (!item) {
      return withCORS(["GET", "OPTIONS"])(notFound());
    }

    const rows = parseData(item);
    if (extraData) {
      const { currentPrice, originalPrice, imageUrl: imgUrl }: any =
        (await extraData) ?? {};
      imageUrl = imgUrl;
      if (currentPrice)
        rows.push({
          currentPrice,
          originalPrice,
          date: new Date()
        });
    }
    const discount = getRealDiscount(rows);
    const transformMetadata = ({
      itemImage,
      itemName,
      real_sale,
      max_price,
      ...rest
    }: any) => ({
      name: itemName,
      imageUrl: imageUrl ?? (itemImage === "null" ? null : itemImage),
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
