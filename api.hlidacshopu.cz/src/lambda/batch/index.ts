import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { DynamoDB } from "aws-sdk";
import { drop, head, take } from "ramda";
import { createShop } from "../shops";
import { response, withCORS } from "../utils";
import { getHistoricalData, metadataPkey } from "../product-detail";
import { getClaimedDiscount, getRealDiscount, prepareData } from "../discount";

export async function handler(event: Request): Promise<Response> {
  if (event.headers["Authorization"] !== `Token ${process.env.TOKEN}`) {
    return withCORS(["POST", "OPTIONS"])({
      statusCode: 401
    });
  }

  if (!event.body) {
    return withCORS(["POST", "OPTIONS"])({
      statusCode: 400,
      body: JSON.stringify({ error: "Missing data" })
    });
  }

  try {
    const payload = Buffer.from(event.body, "base64").toString("ascii");
    let lines = payload.split(/[\r\n]+/);
    const db = new aws.sdk.DynamoDB.DocumentClient();

    let items;
    if (head(lines) === "itemUrl") {
      const urls = drop(1, lines);

      const queries: DynamoDB.DocumentClient.QueryInput[] = take(250, urls)
        .map(url => createShop({ url: encodeURIComponent(url) }))
        .filter(Boolean)
        .map((x: any) => ({
          TableName: "all_shops_metadata",
          ProjectionExpression: "shop, itemId",
          ExpressionAttributeValues: {
            ":pkey": metadataPkey(x.name, <string>x.itemUrl)
          },
          KeyConditionExpression: "pkey = :pkey"
        }));

      const resp = await Promise.all(
        queries.map(query => db.query(query).promise())
      );
      items = resp.map(x => x.Items?.[0]).filter(Boolean);
    } else {
      items = take(250, lines)
        .map(l => l.split(","))
        .map(([shop, itemId]) => ({ shop, itemId }));
    }
    const queries = items.map(async ({ shop, itemId }: any) => {
      let resp: any = await getHistoricalData(db, shop, itemId);
      if (resp) {
        const data = prepareData(resp);
        return {
          shop,
          itemId,
          ...getRealDiscount(data),
          claimedDiscount: getClaimedDiscount(data)
        };
      }
      return { shop, itemId, error: "no-data" };
    });
    let results: any = await Promise.all(queries);
    return withCORS(["POST", "OPTIONS"])(response(results));
  } catch (err) {
    console.error(err);
    throw err;
  }
}
