"use strict";

/* global URL, URLSearchParams */

const aws = require("aws-sdk");
const db = new aws.DynamoDB.DocumentClient();

function optionalChain(first, second) {
  try {
    return first();
  } catch (_) {
    return second();
  }
}

function isSocialMediaBot(ua) {
  return Boolean(
    ua.match(/facebookexternalhit/) ||
      ua.match(/Twitterbot/) ||
      ua.match(/Slackbot/)
  );
}

const shops = new Map([
  [
    "aaaauto",
    url => ({
      title: "AAAAuto.cz",
      currency: "CZK",
      itemId: url.searchParams.get("id"),
      itemUrl: url.searchParams.get("id")
    })
  ],
  [
    "aaaauto_sk",
    url => ({
      title: "AAAAuto.sk",
      currency: "EUR",
      itemId: url.searchParams.get("id"),
      itemUrl: url.searchParams.get("id")
    })
  ],
  [
    "alza",
    url => ({
      title: "Alza.cz",
      currency: "CZK",
      itemId: optionalChain(
        () => url.pathname.match(/d(\d+)\./)[1],
        () => url.searchParams.get("dq")
      ),
      itemUrl: optionalChain(
        () =>
          url.pathname
            .substr(1)
            .match(/[^/]+$/)[0]
            .replace(".htm", ""),
        () => url.pathname.substr(1)
      )
    })
  ],
  [
    "alza_sk",
    url => ({
      title: "Alza.sk",
      currency: "EUR",
      itemId: optionalChain(
        () => url.pathname.match(/d(\d+)\./)[1],
        () => url.searchParams.get("dq")
      ),
      itemUrl: optionalChain(
        () =>
          url.pathname
            .substr(1)
            .match(/[^/]+$/)[0]
            .replace(".htm", ""),
        () => url.pathname.substr(1)
      )
    })
  ],
  [
    "mall",
    url => ({
      title: "Mall.cz",
      currency: "CZK",
      itemId: optionalChain(
        () => url.pathname.substr(1).match(/[^/]+$/)[0],
        () => null
      ),
      itemUrl: optionalChain(
        () => url.pathname.substr(1).match(/[^/]+$/)[0],
        () => null
      )
    })
  ],
  [
    "mall_sk",
    url => ({
      title: "Mall.sk",
      currency: "EUR",
      itemId: optionalChain(
        () => url.pathname.substr(1).match(/[^/]+$/)[0],
        () => null
      ),
      itemUrl: optionalChain(
        () => url.pathname.substr(1).match(/[^/]+$/)[0],
        () => null
      )
    })
  ]
]);

function shopName(s) {
  const url = new URL(s);
  const domainParts = url.host.split(".");
  const domain = domainParts.pop();
  const shopName = domainParts.pop();
  return domain !== "cz" ? `${shopName}_${domain}` : shopName;
}

function parseItemDetails(detailUrl) {
  const name = shopName(detailUrl);
  const { itemUrl, itemId, currency, title } = shops.get(name)(
    new URL(detailUrl)
  );
  return { name, title, itemUrl, itemId, currency };
}

const content = (url, name, imageUrl, actualPrice, currency) => `
<\!DOCTYPE html>
<html lang="cs">
<head prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# product: http://ogp.me/ns/product#">
<meta charset="utf-8">
<title>${name}</title>
<meta property="og:type" content="og:product" />
<meta property="og:title" content="${name}" />
<meta property="og:url" content="${url}" />
<meta property="product:price:amount" content="${actualPrice}" />
<meta property="product:price:currency" content="${currency}" />
<meta name="twitter:image" property="og:image" content="${imageUrl}" />
<meta name="twitter:description" property="og:description" content="Podívejte se na vývoj ceny a reálnost slevy.">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@hlidacshopucz">
<meta name="twitter:title" content="${name}">
</head>
<body></body>
</html>
`;

function metadataPkey(name, itemUrl) {
  return `${name}:${itemUrl}`;
}

function queryDatabase(name, itemUrl, itemId) {
  return db
    .query({
      TableName: "all_shops_metadata",
      ExpressionAttributeValues: {
        ":pkey": metadataPkey(name, itemUrl),
        ...(itemId ? { ":itemId": itemId } : {})
      },
      KeyConditionExpression:
        "pkey = :pkey" + (itemId ? " AND itemId = :itemId" : "")
    })
    .promise()
    .then(x => x.Items && x.Items[0]);
}

async function createMetadataResponse(url) {
  const { name, title, itemUrl, itemId, currency } = parseItemDetails(url);
  const { itemName, currentPrice } = await queryDatabase(name, itemUrl, itemId);
  const query = new URLSearchParams({ url });
  return {
    status: "200",
    statusDescription: "OK",
    headers: {
      "content-type": [{ value: "text/html" }]
    },
    body: content(
      `https://www.hlidacshopu.cz/app/?${query}`,
      `${title} prodává ${itemName}`,
      `https://api2.hlidacshopu.cz/og?${query}`,
      currentPrice,
      currency
    )
  };
}

exports.handler = async function (event, _context) {
  const request = event.Records[0].cf.request;
  const ua = request.headers["user-agent"][0].value;
  if (isSocialMediaBot(ua)) {
    const qs = new URLSearchParams(request.querystring);
    const url = qs.get("url");
    return await createMetadataResponse(url);
  }
  return request;
};
