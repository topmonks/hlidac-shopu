import { DynamoDBClient } from "@aws-sdk/client-dynamodb/dist/es/DynamoDBClient.js";
import { movedPermanently, response, withCORS } from "../utils.mjs";
import { createShop, ShopError } from "../shops.mjs";

/** @typedef { import("@pulumi/awsx/apigateway").Request } Request */
/** @typedef { import("@pulumi/awsx/apigateway").Response } Response */
/** @typedef { import("../shops.mjs").ShopParams } ShopParams */

const db = new DynamoDBClient({});

/**
 * @param {Request} event
 * @returns {Promise.<Response>}
 */
export async function handler(event) {
  /** @type {ShopParams | undefined} */
  const params = event.queryStringParameters;
  if (!params?.api) {
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

  const result = {};
  try {
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
