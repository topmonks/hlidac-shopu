import { isSocialMediaBot } from "@hlidac-shopu/lib/user-agent.mjs";

/** @typedef { import("@types/aws-lambda").CloudFrontRequestEvent } CloudFrontRequestEvent */
/** @typedef { import("@types/aws-lambda").CloudFrontRequestResult } CloudFrontRequestResult */

const content = url => `<\!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title></title>
<link rel="canonical" href="${url}">
</head>
</html>
`;

/**
 * @param {string} url
 * @return {Promise<CloudFrontRequestResult>}
 */
async function createRedirectResponse(url) {
  const query = new URLSearchParams({ url });
  return {
    status: "301",
    statusDescription: "Moved Permanently",
    headers: {
      "content-type": [{ value: "text/html" }],
      "location": [{ value: `https://www.hlidacshopu.cz/app/?${query}` }]
    },
    body: content(`https://www.hlidacshopu.cz/app/?${query}`)
  };
}

/**
 * @param {CloudFrontRequestEvent} event
 * @returns {Promise<CloudFrontRequestResult>}
 */
export async function handler(event) {
  const request = event.Records[0].cf.request;
  const ua = request.headers["user-agent"][0].value;
  const qs = new URLSearchParams(request.querystring);
  const url = qs.get("url");
  if (isSocialMediaBot(ua) && request.uri === "/" && url) {
    return await createRedirectResponse(url);
  }
  return request;
}
