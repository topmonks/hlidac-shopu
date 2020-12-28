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
  const params = event.queryStringParameters || {};
  let query;
  if (params.year) {
    query = {
      Key: marshall({ "year": params.year }),
      TableName: "black_friday_data"
    };
  } else {
    query = {
      Key: marshall({ "pkey": "shopNumbers" }),
      TableName: "all_shops_stats"
    };
  }
  const res = await db.send(new GetItemCommand(query));

  return withCORS(["GET", "OPTION"])(
    res.Item
      ? response(unmarshall(res.Item).json, {
          "Cache-Control": "max-age=14400"
        })
      : notFound()
  );
}
