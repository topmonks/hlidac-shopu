import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { notFound, response, withCORS } from "../utils";

export async function handler(event: Request): Promise<Response> {
  const db = new aws.sdk.DynamoDB.DocumentClient();
  const res = await db
    .get({
      Key: { "pkey": "reviewsStats" },
      TableName: "all_shops_stats"
    })
    .promise();

  return withCORS(["GET", "OPTIONS"])(
    res.Item ? response(res.Item?.json) : notFound()
  );
}
