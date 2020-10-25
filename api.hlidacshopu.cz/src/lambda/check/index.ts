import * as aws from "@pulumi/aws";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { movedPermanently, response, withCORS } from "../utils";
import { createShop, ShopError, ShopParams } from "../shops";

export async function handler(event: Request): Promise<Response> {
  const params = (<unknown>(event.queryStringParameters || {})) as ShopParams;
  if (!params.api) {
    return withCORS(["GET", "OPTIONS"])(
      movedPermanently("https://www.hlidacshopu.cz/check")
    );
  }
  if (!params.url) {
    return withCORS(["GET", "OPTIONS"])({
      statusCode: 400,
      body: JSON.stringify({ error: "invalid url" })
    });
  }

  const result: any = {};

  try {
    const db = new aws.sdk.DynamoDB.DocumentClient();
    const shop = createShop(params, db);
    result.shop = {
      name: shop?.name,
      itemId: shop?.itemId,
      itemUrl: shop?.itemUrl,
      metadataPkey: `${shop?.name}:${shop?.itemUrl}`,
      pkey: await shop?.pkey()
    };
    result.metadata = await shop?.getMetadata();
  } catch (error) {
    if (error instanceof ShopError) {
      result.error = error;
    } else {
      throw error;
    }
  }
  return withCORS(["GET", "OPTIONS"])(response(result));
}
