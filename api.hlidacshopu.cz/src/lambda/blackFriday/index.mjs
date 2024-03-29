import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { notFound, response, withCORS } from "../http.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */

const db = new DynamoDBClient({});

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handler(event) {
  const { year } = event.queryStringParameters;
  const res = await db.send(
    new GetItemCommand({
      Key: { "year": { S: year } },
      TableName: "black_friday_data"
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
