import Rollbar from "../../rollbar.mjs";
import { withCORS } from "../http.mjs";

const rollbar = Rollbar.init({ lambdaName: "og" });

/** @typedef { import("@pulumi/awsx/apigateway").Request } APIGatewayProxyEvent */
/** @typedef { import("@pulumi/awsx/apigateway").Response } APIGatewayProxyResult */
/** @typedef { import("@hlidac-shopu/lib/shops.mjs").ShopParams } ShopParams */

/**
 * @param {APIGatewayProxyEvent} event
 * @returns {Promise.<APIGatewayProxyResult>}
 */
export async function handleRequest(event) {
  const qs = event.queryStringParameters;
  if (!qs?.url) {
    return withCORS(["GET", "OPTIONS"])({
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing url parameter" })
    });
  }

  const url = new URLSearchParams({ url: qs.url });
  const params = new URLSearchParams({
    "token": process.env.TOKEN ?? "",
    "url": `https://www.hlidacshopu.cz/widget/?${url}`,
    "waitUntil": "networkidle0",
    "fullPage": "1",
    "w": "600",
    "h": "315",
    "dpr": "2"
  });

  const resp = await fetch(`${process.env.HOST}?${params}`, {
    signal: AbortSignal.timeout(30000),
    headers: event.headers
  });
  if (!resp.ok) {
    rollbar.error(resp.statusText, await resp.text());
    return withCORS(["GET", "OPTIONS"])({
      statusCode: resp.status,
      body: resp.statusText
    });
  }
  const buffer = await resp.arrayBuffer();
  return withCORS(["GET", "OPTIONS"])({
    statusCode: 200,
    headers: {
      "Content-Type": resp.headers.get("Content-Type"),
      "Cache-Control": "public, max-age=3600"
    },
    isBase64Encoded: true,
    body: Buffer.from(buffer).toString("base64")
  });
}

export const handler = rollbar.lambdaHandler(handleRequest);
