"use strict";

/* global URLSearchParams */

const content = url => `<\!DOCTYPE html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title></title>
<link rel="canonical" href="${url}">
</head>
</html>
`;

function isSocialMediaBot(ua) {
  return Boolean(
    ua.match(/facebookexternalhit/) ||
      ua.match(/Twitterbot/) ||
      ua.match(/Slackbot/)
  );
}

async function createMetadataResponse(url) {
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

exports.handler = async function (event, _context) {
  const request = event.Records[0].cf.request;
  const ua = request.headers["user-agent"][0].value;
  const qs = new URLSearchParams(request.querystring);
  const url = qs.get("url");
  console.log(request.uri, url);
  if (isSocialMediaBot(ua) && request.uri === "/" && url) {
    return await createMetadataResponse(url);
  }
  return request;
};
