"use strict";

/* global URL, URLSearchParams */

const aws = require("aws-sdk");
const https = require("https");

const db = new aws.DynamoDB.DocumentClient({
  apiVersion: "latest",
  region: "eu-central-1",
  httpOptions: {
    agent: new https.Agent({ keepAlive: true })
  }
});

const content = (url, name, imageUrl) => `<\!DOCTYPE html>
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

function optionalChain(first, second = () => null) {
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
      get itemUrl() {
        return this.itemId;
      }
    })
  ],
  [
    "aaaauto_sk",
    url => ({
      title: "AAAAuto.sk",
      currency: "EUR",
      itemId: url.searchParams.get("id"),
      get itemUrl() {
        return this.itemId;
      }
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
    "benu",
    url => ({
      title: "Benu.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.substr(1).match(/\/([^/]+)/)[1])
    })
  ],
  [
    "czc",
    url => ({
      title: "czc.cz",
      currency: "CZK",
      itemId: optionalChain(() =>
        url.pathname.match(/\/(\d+)a?\//)[1].replace("a", "")
      ),
      get itemUrl() {
        return this.itemId;
      }
    })
  ],
  [
    "datart",
    url => ({
      title: "Datart.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(
        () => url.pathname.substr(1).match(/([^/]+)\.html$/)[1]
      )
    })
  ],
  [
    "datart_sk",
    url => ({
      title: "Datart.sk",
      currency: "EUR",
      itemId: null,
      itemUrl: optionalChain(
        () => url.pathname.substr(1).match(/([^/]+)\.html$/)[1]
      )
    })
  ],
  [
    "iglobus",
    url => ({
      key: "globus_cz",
      title: "iGlobus.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(
        () => url.hash.match(/#(.+)/)[1],
        () => url.pathname.match(/\/[^/]+\/([^/]+)$/)[1]
      )
    })
  ],
  [
    "itesco",
    url => ({
      title: "iTesco.cz",
      currency: "CZK",
      itemId: optionalChain(() => url.pathname.match(/(\d+)$/)[1]),
      get itemUrl() {
        return this.itemId;
      }
    })
  ],
  [
    "itesco_sk",
    url => ({
      title: "iTesco.sk",
      currency: "EUR",
      itemId: optionalChain(() => url.pathname.match(/(\d+)$/)[1]),
      get itemUrl() {
        return this.itemId;
      }
    })
  ],
  [
    "kasa",
    url => ({
      title: "Kasa.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/\/([^/]+)/)[1])
    })
  ],
  [
    "kosik",
    url => ({
      title: "Košík.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/[^/]+$/)[0])
    })
  ],
  [
    "lekarna",
    url => ({
      title: "Lékárna.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(
        () => url.pathname.substr(1).match(/(?:[^/]+\/)?([^/]+)/)[1]
      )
    })
  ],
  [
    "mall",
    url => ({
      title: "Mall.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.substr(1).match(/[^/]+$/)[0])
    })
  ],
  [
    "mall_sk",
    url => ({
      title: "Mall.sk",
      currency: "EUR",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.substr(1).match(/[^/]+$/)[0])
    })
  ],
  [
    "mironet",
    url => ({
      title: "Mironet.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.replace(/\//g, ""))
    })
  ],
  [
    "mountfield",
    url => ({
      title: "Mountfield.cz",
      currency: "CZK",
      itemId: optionalChain(() => url.pathname.pathname.match(/-([^-]+)$/)[1]),
      get itemUrl() {
        return this.itemId;
      }
    })
  ],
  [
    "mountfield_sk",
    url => ({
      title: "Mountfield.sk",
      currency: "EUR",
      itemId: optionalChain(() => url.pathname.pathname.match(/-([^-]+)$/)[1]),
      get itemUrl() {
        return this.itemId;
      }
    })
  ],
  [
    "notino",
    url => ({
      title: "Notino.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.substr(1).replace(/\//g, "")[1])
    })
  ],
  [
    "notino_sk",
    url => ({
      title: "Notino.sk",
      currency: "EUR",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.substr(1).replace(/\//g, "")[1])
    })
  ],
  [
    "okay",
    url => ({
      title: "Okay.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/\/([^/]+)/)[1])
    })
  ],
  [
    "okay_sk",
    url => ({
      title: "Okay.sk",
      currency: "EUR",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/\/([^/]+)/)[1])
    })
  ],
  [
    "pilulka",
    url => ({
      title: "Pilulka.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/\/([^/]+)/)[1])
    })
  ],
  [
    "pilulka_sk",
    url => ({
      title: "Pilulka.sk",
      currency: "EUR",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/\/([^/]+)/)[1])
    })
  ],
  [
    "prozdravi",
    url => ({
      title: "Prozdravi.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/\/([^/]+)/)[1])
    })
  ],
  [
    "rohlik",
    url => ({
      title: "Rohlík.cz",
      currency: "CZK",
      itemId: optionalChain(
        () => url.searchParams.get("productPopup").match(/^(\d+)/)[1],
        () => url.pathname.substr(1).match(/^(\d+)/)[1]
      ),
      get itemUrl() {
        return this.itemId;
      }
    })
  ],
  [
    "sleky",
    url => ({
      title: "sLéky.cz",
      currency: "CZK",
      itemId: null,
      itemUrl: optionalChain(() => url.pathname.match(/\/([^/]+)/)[1])
    })
  ],
  [
    "tsbohemia",
    url => ({
      title: "TSBohemia.cz",
      currency: "CZK",
      itemId: optionalChain(() => url.pathname.match(/d(\d+)\.html/)[1]),
      get itemUrl() {
        return this.itemId;
      }
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
  const { key, itemUrl, itemId, currency, title } = shops.get(name)(
    new URL(detailUrl)
  );
  return { name: key || name, title, itemUrl, itemId, currency };
}

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
  const { name, title, itemUrl, itemId } = parseItemDetails(url);
  const { itemName } = await queryDatabase(name, itemUrl, itemId);
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
      `https://api2.hlidacshopu.cz/og?${query}`
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
