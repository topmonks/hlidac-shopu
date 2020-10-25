import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { notFound, response, withCORS } from "../utils";

export async function handler(event: Request): Promise<Response> {

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

  const db = new aws.sdk.DynamoDB.DocumentClient();
  const res = await db
    .get({
      Key: { "pkey": yesterday },
      TableName: <string>discountTypes.get(discount)
    })
    .promise();

  return withCORS(["GET", "OPTIONS"])(
    res.Item ? response(res.Item.json) : notFound()
  );
}
