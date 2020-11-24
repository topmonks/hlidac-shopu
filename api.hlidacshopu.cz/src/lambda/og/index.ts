import fetch from "node-fetch";
import AbortController from "abort-controller";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { ShopParams } from "../shops";
import { withCORS } from "../utils";

const cache: Record<string, any> = {};

export async function handler(event: Request): Promise<Response> {
  const params = (<unknown>(event.queryStringParameters || {})) as ShopParams;
  if (!params.url) {
    return withCORS(["GET", "OPTIONS"])({
      statusCode: 400,
      body: JSON.stringify({ error: "Missing url parameter" })
    });
  }

  if (cache[params.url]) {
    return cache[params.url];
  }

  const token = new URLSearchParams({ token: process.env.TOKEN ?? "" });
  const url = new URLSearchParams({ url: params.url });
  const abort = new AbortController();
  setTimeout(() => abort.abort(), 30000);
  const resp = await fetch(
    `https://api.apify.com/v2/acts/jlafek~actor-screenshot-url/run-sync?${token}`,
    {
      method: "POST",
      headers: [["Content-Type", "application/json"]],
      body: JSON.stringify({
        "url": `https://www.hlidacshopu.cz/widget/?${url}`,
        "waitUntil": "networkidle0",
        "delay": 1000,
        "viewportWidth": 600,
        "viewportHeight": 315,
        "fullPage": true,
        "deviceScaleFactor": 2
      }),
      signal: abort.signal
    }
  );
  if (!resp.ok) {
    console.error(resp.statusText, await resp.text());
    return withCORS(["GET", "OPTIONS"])({
      statusCode: resp.status,
      body: resp.statusText
    });
  }
  const buffer = await resp.buffer();
  const response = withCORS(["GET", "OPTIONS"])({
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "maxage=3600"
    },
    isBase64Encoded: true,
    body: buffer.toString("base64")
  });
  cache[params.url] = response;
  return response;
}
