import { parseItemDetails } from "@hlidac-shopu/lib/shops.mjs";
import { isSocialMediaBot } from "@hlidac-shopu/lib/user-agent.mjs";
import { S3 } from "@aws-sdk/client-s3";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const s3 = new S3({ region: "eu-central-1", maxAttempts: 3 });

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

async function getMetadata(origin, itemUrl, itemId) {
  const resp = await s3.getObject({
    Bucket: "data.hlidacshopu.cz",
    Key: `items/${origin}/${itemId}/meta.json`
  });
  if (resp.$metadata.httpStatusCode === 200) {
    const content = await resp.Body.transformToString();
    return JSON.parse(content)?.itemName;
  }
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
    const { title, itemUrl, itemId, origin } = shopDetail;
    const itemName = await getMetadata(origin, itemUrl, itemId);
    if (!itemName) {
      return {
        status: "404",
        statusDescription: "Not Found"
      };
    }
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
        imageUrl: `https://api.hlidacshopu.cz/v2/og?${query}`
      })
    };
  } catch (err) {
    console.error(err);
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
