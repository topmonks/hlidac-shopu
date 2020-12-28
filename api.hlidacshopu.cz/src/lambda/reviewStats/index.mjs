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
  const res = await db.send(
    new GetItemCommand({
      Key: marshall({ "pkey": "reviewsStats" }),
      TableName: "all_shops_stats"
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
