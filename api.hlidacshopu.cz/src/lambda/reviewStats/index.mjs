import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { notFound, response, withCORS } from "../http.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const db = new DynamoDBClient({});

/**
 * @param {APIGatewayProxyEvent} _event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(_event) {
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
