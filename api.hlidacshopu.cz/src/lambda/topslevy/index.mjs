import { DynamoDBClient } from "@aws-sdk/client-dynamodb/dist/es/DynamoDBClient.js";
import { GetItemCommand } from "@aws-sdk/client-dynamodb/dist/es/commands/GetItemCommand.js";
import { marshall } from "@aws-sdk/util-dynamodb/dist/es/marshall.js";
import { unmarshall } from "@aws-sdk/util-dynamodb/dist/es/unmarshall.js";
import { notFound, response, withCORS } from "../http.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } Request */
/** @typedef { import("@pulumi/awsx/apigateway").Response } Response */

const db = new DynamoDBClient({});

/**
 * @param {Request} event
 * @returns {Promise.<Response>}
 */
export async function handler(event) {
  const discount = event.queryStringParameters?.discount ?? "rel";
  const discountTypes = new Map([
    ["abs", "topslevy_czk_discount_daily"],
    ["rel", "topslevy_perc_discount_daily"]
  ]);
  if (!discountTypes.has(discount)) {
    return withCORS(["GET", "OPTIONS"])({
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid discount type" })
    });
  }
  const date = new Date();
  date.setDate(date.getDate() - 1);

  const [yesterday] = date.toISOString().split("T");
  const res = await db.send(
    new GetItemCommand({
      Key: marshall({ "pkey": yesterday }),
      TableName: discountTypes.get(discount)
    })
  );

  return withCORS(["GET", "OPTIONS"])(
    res.Item
      ? response(unmarshall(res.Item).json, {
          "Cache-Control": "max-age=14400"
        })
      : notFound()
  );
}
