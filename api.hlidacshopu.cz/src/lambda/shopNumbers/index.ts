import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { notFound, response, withCORS } from "../utils";

export async function handler(event: Request): Promise<Response> {
  const params = event.queryStringParameters || {};
  let query;
  if (params.year) {
    query = {
      Key: { "year": params.year },
      TableName: "black_friday_data"
    };
  } else {
    query = {
      Key: { "pkey": "shopNumbers" },
      TableName: "all_shops_stats"
    };
  }
  const db = new aws.sdk.DynamoDB.DocumentClient();
  const res = await db.get(query).promise();

  return withCORS(["GET", "OPTION"])(
    res.Item
      ? response(res.Item?.json, { "Cache-Control": "max-age=14400" })
      : notFound()
  );
}
