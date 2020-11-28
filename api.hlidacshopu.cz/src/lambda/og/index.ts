import fetch from "node-fetch";
import AbortController from "abort-controller";
import { Request, Response } from "@pulumi/awsx/apigateway";
import { ShopParams } from "../shops";
import { withCORS } from "../utils";

export async function handler(event: Request): Promise<Response> {
  const params = (<unknown>(event.queryStringParameters || {})) as ShopParams;
  if (!params.url) {
    return withCORS(["GET", "OPTIONS"])({
      statusCode: 400,
      body: JSON.stringify({ error: "Missing url parameter" })
    });
  }

  const url = new URLSearchParams({ url: params.url });
  const abort = new AbortController();
  setTimeout(() => abort.abort(), 30000);

  const request = new URLSearchParams({
    "token": process.env.TOKEN ?? "",
    "url": `https://www.hlidacshopu.cz/widget/?${url}`,
    "waitUntil": "networkidle0",
    "fullPage": "1",
    "w": "600",
    "h": "315",
    "dpr": "2"
  });

  const resp = await fetch(`${process.env.HOST}/?${request}`, {
    signal: abort.signal
  });
  if (!resp.ok) {
    console.error(resp.statusText, await resp.text());
    return withCORS(["GET", "OPTIONS"])({
      statusCode: resp.status,
      body: resp.statusText
    });
  }
  const buffer = await resp.buffer();
  return withCORS(["GET", "OPTIONS"])({
    statusCode: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "maxage=3600"
    },
    isBase64Encoded: true,
    body: buffer.toString("base64")
  });
}
