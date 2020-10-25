import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { createShop, ShopError, ShopParams } from "../shops";
import { notFound, response, withCORS } from "../utils";

export async function handler(event: Request): Promise<Response> {
  try {
    const params = (<unknown>(event.queryStringParameters || {})) as ShopParams;
    if (!params.url) {
      return withCORS(["GET", "OPTIONS"])({
        statusCode: 400,
        body: JSON.stringify({ error: "Missing url parameter" })
      });
    }

    const db = new aws.sdk.DynamoDB.DocumentClient();
    const shop = createShop(params, db);
    if (!shop) {
      return withCORS(["GET", "OPTIONS"])(notFound());
    }

    const res = await db
      .get({
        Key: { "p_key": await shop.pkey() },
        TableName: "all_shops"
      })
      .promise();

    const foundData = Boolean(res.Item);
    const data = foundData ? JSON.parse(res.Item?.json) : [];

    try {
      if (shop.metadata || event.queryStringParameters?.metadata === "1") {
        await shop.getMetadata();
      }
    } catch (error) {
      if (!(error instanceof ShopError)) throw error;
      const { name, message, stack } = error;
      console.error({
        type: "error",
        name,
        message,
        stack,
        text: error.toString()
      });
    }

    if (!foundData) {
      return withCORS(["GET", "OPTIONS"])(notFound());
    }
    return withCORS(["GET", "OPTIONS"])(
      response({ "data": data, "metadata": shop.metadata ?? {} })
    );
  } catch (error) {
    if (error instanceof ShopError) {
      const { message } = error;
      return withCORS(["GET", "OPTIONS"])(
        notFound({ "data": [], "metadata": { "error": message } })
      );
    } else {
      throw error;
    }
  }
}
