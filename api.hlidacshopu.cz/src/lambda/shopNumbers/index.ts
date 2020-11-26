import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { notFound, response, withCORS } from "../utils";

export async function handler(event: Request): Promise<Response> {
  const db = new aws.sdk.DynamoDB.DocumentClient();
  const res = await db
    .get({
      Key: { "year": "2020" },
      TableName: "black_friday_data"
    })
    .promise();

  return withCORS(["GET", "OPTION"])(
    res.Item
      ? response(res.Item?.json, { "Cache-Control": "max-age=14400" })
      : notFound()
  );
}
