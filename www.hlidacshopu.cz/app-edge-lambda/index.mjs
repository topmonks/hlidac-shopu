import * as metadata from "@hlidac-shopu/lib/metadata.mjs";
import { parseItemDetails } from "@hlidac-shopu/lib/shops.mjs";
import { isSocialMediaBot } from "@hlidac-shopu/lib/user-agent.mjs";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const aws = require("aws-sdk");
const https = require("https");

const db = new aws.DynamoDB.DocumentClient({
  apiVersion: "latest",
  region: "eu-central-1",
  httpOptions: {
    agent: new https.Agent({ keepAlive: true })
  }
});

const content = ({ url, name, imageUrl }) => `<\!DOCTYPE html>
<html lang="cs">
<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb#">
<meta charset="utf-8">
<title>${name}</title>
<meta property="og:type" content="og:website" />
<meta property="og:title" content="${name}" />
<meta property="og:url" content="${url}" />
<meta name="twitter:image" property="og:image" content="${imageUrl}" />
<meta name="twitter:description" property="og:description" content="Podívejte se na vývoj ceny a reálnost slevy.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@hlidacshopucz">
<meta name="twitter:title" content="${name}">
</head>
<body></body>
</html>
`;

function queryDatabase(name, itemUrl, itemId) {
  return db
    .query({
      TableName: "all_shops_metadata",
      ExpressionAttributeValues: {
        ":pkey": metadata.pkey(name, itemUrl),
        ...(itemId ? { ":itemId": itemId } : {})
      },
      KeyConditionExpression:
        "pkey = :pkey" + (itemId ? " AND itemId = :itemId" : "")
    })
    .promise()
    .then(x => x.Items && x.Items[0]);
}

/**
 * @param {string} url
 * @returns {Promise<CloudFrontRequestResult>}
 */
async function createMetadataResponse(url) {
  try {
    let shopDetail = parseItemDetails(url);
    if (!shopDetail) {
      return {
        status: "404",
        statusDescription: "Not Found"
      };
    }
    const { key, title, itemUrl, itemId } = shopDetail;
    const { itemName } = await queryDatabase(key, itemUrl, itemId);
    const query = new URLSearchParams({ url });
    return {
      status: "200",
      statusDescription: "OK",
      headers: {
        "content-type": [{ value: "text/html" }]
      },
      body: content({
        url: `https://www.hlidacshopu.cz/app/?${query}`,
        name: `${title} prodává ${itemName}`,
        imageUrl: `https://api.hlidacshopu.cz/og?${query}`
      })
    };
  } catch (err) {
    return {
      status: "400",
      statusDescription: "Invalid Request"
    };
  }
}

/**
 * @param {CloudFrontRequestEvent} event
 * @returns {Promise<CloudFrontRequestResult>}
 */
export async function handler(event) {
  const { request } = event.Records[0].cf;
  const ua = request.headers["user-agent"][0].value;
  if (isSocialMediaBot(ua)) {
    const qs = new URLSearchParams(request.querystring);
    const url = qs.get("url");
    return await createMetadataResponse(url);
  }
  return request;
}
