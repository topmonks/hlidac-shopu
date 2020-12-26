import { DynamoDBClient } from "@aws-sdk/client-dynamodb/dist/es/DynamoDBClient.js";
import { QueryCommand } from "@aws-sdk/client-dynamodb/dist/es/commands/QueryCommand.js";
import { marshall } from "@aws-sdk/util-dynamodb/dist/es/marshall.js";
import { unmarshall } from "@aws-sdk/util-dynamodb/dist/es/unmarshall.js";
import drop from "ramda/es/drop.js";
import head from "ramda/es/head.js";
import take from "ramda/es/take.js";
import { createShop } from "../shops.mjs";
import { response, withCORS } from "../utils.mjs";
import { getHistoricalData, metadataPkey } from "../product-detail.mjs";
import {
  getClaimedDiscount,
  getRealDiscount,
  prepareData
} from "../discount.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } Request */
/** @typedef { import("@pulumi/awsx/apigateway").Response } Response */

const db = new DynamoDBClient({});

/**
 * @param {Request} event
 * @returns {Promise.<Response>}
 */
export async function handler(event) {
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
    const lines = payload.split(/[\r\n]+/);

    let items;
    if (head(lines) === "itemUrl") {
      const urls = drop(1, lines);
      const queries = take(250, urls)
        .map(url => createShop({ url: encodeURIComponent(url) }))
        .filter(Boolean)
        .map(
          x =>
            new QueryCommand({
              TableName: "all_shops_metadata",
              ProjectionExpression: "shop, itemId",
              ExpressionAttributeValues: marshall({
                ":pkey": metadataPkey(x.name, x.itemUrl)
              }),
              KeyConditionExpression: "pkey = :pkey"
            })
        );
      const resp = await Promise.all(queries.map(query => db.send(query)));
      items = resp.map(x => x.Items && unmarshall(x.Items[0])).filter(Boolean);
    } else {
      items = take(250, lines)
        .map(l => l.replace(/"/g, "").split(","))
        .map(([shop, itemId]) => ({ shop, itemId }));
    }
    const queries = items.map(async ({ shop, itemId }) => {
      const resp = await getHistoricalData(db, shop, itemId);
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
    const results = await Promise.all(queries);
    return withCORS(["POST", "OPTIONS"])(response(results));
  } catch (err) {
    console.error(err);
    throw err;
  }
}
