const Apify = require("apify");
const cheerio = require("cheerio");
const randomUA = require("modern-random-ua");
const CloudFlareUnBlocker = require("./cloudflare-unblocker");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

function parseDetail(json) {
  const { product } = json.data;
  // getting data for main section
  const identifier = product.productId;
  const webUrl = `https://www.rohlik.cz/${product.baseLink}`;

  // getting data for breadcrumbs
  const itemListElement = product.categories.map(category => ({
    "@type": "ListItem",
    position: category.level + 1,
    item: {
      "@id": `https://www.rohlik.cz/services/frontend-service/products/${category.id}?offset=0&limit=25`,
      name: category.name
    }
  }));
  const breadcrumbs = {
    "@context": "http://schema.org",
    "@type": "BreadcrumbList",
    itemListElement
  };

  // getting data for main entity

  const name = product.productName;
  const description = product.description
    ? cheerio.load(product.description).text()
    : "";
  const image = `https://www.rohlik.cz/cdn-cgi/image/f=auto,w=500,h=500/https://cdn.rohlik.cz/images/grocery/products/${product.imgPath}`;
  const { brand } = product;

  // getting data for offers
  const priceCurrency = product.price.currency;
  const price = product.price ? product.price.full : "";
  const itemCondition = "http://schema.org/NewCondition";
  const availability = product.inStock;
  const offers = {
    "@type": "Offer",
    priceCurrency,
    price,
    itemCondition,
    availability
  };

  // getting data for additionalProperty
  const additionalProperty = [
    {
      "@type": "PropertyValue",
      name: "unit",
      value: product.unit ?? ""
    },
    {
      "@type": "PropertyValue",
      name: "pricePerUnit",
      value: product.pricePerUnit
        ? product.pricePerUnit.full + product.pricePerUnit.currency
        : ""
    },
    {
      "@type": "PropertyValue",
      name: "country",
      value: product.countries?.[0]?.name ?? ""
    },
    {
      "@type": "PropertyValue",
      name: "countryCode",
      value: product.countries?.[0]?.code ?? ""
    },
    {
      "@type": "PropertyValue",
      name: "composition",
      value: product.composition ?? ""
    },
    {
      "@type": "PropertyValue",
      name: "ingredients",
      value: product.ingredients ?? ""
    },
    {
      "@type": "PropertyValue",
      name: "similarProducts",
      value: json.data.similarProducts ?? ""
    }
  ];

  const mainEntity = {
    "@context": "http://schema.org",
    "@type": "Product",
    name,
    description,
    image,
    offers,
    brand,
    additionalProperty
  };

  // getting data for mainContentOfPage
  const mainContentOfPage = [
    {
      "@type": "WebPageElement",
      encodingFormat: "application/json",
      encoding: JSON.stringify(json.data)
    }
  ];

  // Return an object with the data extracted from the page.
  // It will be stored to the resulting dataset.
  return {
    "@context": "http://schema.org",
    "@type": "ItemPage",
    identifier,
    url: webUrl,
    breadcrumbs,
    mainEntity,
    mainContentOfPage
  };
}

const parseHlidacShopuData = json => ({
  priceHistory: {
    "@type": "WebPageElement",
    cssSelector: "#hlidacshopu",
    encodingFormat: "application/json",
    encoding: JSON.stringify(json)
  }
});

function postprocess(result, extensions) {
  const extensionHandlers = {
    "hlidac-shopu": () => {
      result.thumbnailUrl = `https://api2.hlidacshopu.cz/og/?${new URLSearchParams(
        { url: result.url }
      )}`;
      result.mainContentOfPage.push(result.priceHistory);
      result.priceHistory = undefined;
    }
  };

  result.mainEntity = result.mainEntity || {
    "@error": "Linked data not found"
  };
  if (result.parameters) {
    result.mainEntity.additionalProperty = result.parameters;
    result.parameters = undefined;
  }
  result.image = result.image || [];
  result.mainEntity.image = Array.from(
    new Set([result.mainEntity.image, ...result.image]).values()
  );
  result.image = undefined;

  result.mainContentOfPage = result.mainContentOfPage || [];
  for (const ext of extensions) {
    extensionHandlers[ext]();
  }
  return result;
}

async function handlePageFunction(context, requestQueue) {
  const { request, response, json } = context;
  if (response.statusCode !== 200) {
    log.info("Status code:", response.statusCode);
  }

  const { part, extensions, result } = request.userData;
  if (json.error || json.status === 400) {
    log.info("not found", { url: request.url, part });
    return;
  }
  const parts = new Map([
    [
      "detail",
      () => {
        const detail = parseDetail(json);
        return requestQueue.addRequest({
          url: `https://api2.hlidacshopu.cz/detail?${new URLSearchParams({
            url: detail.url
          })}`,
          retryCount: 10,
          userData: {
            part: "hlidac-shopu",
            extensions,
            result: detail
          }
        });
      }
    ],
    [
      "hlidac-shopu",
      () =>
        Apify.pushData(
          postprocess({ ...result, ...parseHlidacShopuData(json) }, extensions)
        )
    ]
  ]);

  const partHandler = parts.get(part);
  if (partHandler) {
    await partHandler();
    log.info("handled page", { url: request.url, part });
  } else {
    log.warning("unknown part", { url: request.url, part });
  }
}

function getTableName(country) {
  return `rohlik_${country.toLowerCase()}_details`;
}

async function uploadToKeboola(tableName) {
  /** @type {ApifyEnv} */
  const env = await Apify.getEnv();
  /** @type {ActorRun} */
  const run = await Apify.call(
    "blackfriday/uploader",
    {
      datasetId: env.defaultDatasetId,
      upload: true,
      actRunId: env.actorRunId,
      tableName
    },
    {
      waitSecs: 25
    }
  );
  log.info(`Keboola upload called: ${run.id}`);
}

Apify.main(async () => {
  const input = await Apify.getInput();

  const {
    products = [],
    country = "cz",
    extensions = [],
    maxConcurrency = 10,
    sleep = 1,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input || {};

  const urls = products.map(({ url }) => url).filter(Boolean);
  const requests = Array.from(
    new Set(
      urls.map(url => ({
        url,
        retryCount: 10,
        userData: { part: "detail", extensions }
      }))
    )
  );

  const requestList = await Apify.openRequestList("rohlik-detail", requests);
  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  const cloudFlareUnBlocker = new CloudFlareUnBlocker({
    unblockUrl: urls.pop(),
    proxyConfiguration
  });

  // Create crawler.
  const crawler = new Apify.BasicCrawler({
    requestList,
    requestQueue,
    maxConcurrency,
    maxRequestRetries: 10,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 100,
      createSessionFunction: cloudFlareUnBlocker.createSessionFunction.bind(
        cloudFlareUnBlocker
      )
    },
    handleRequestFunction: async ({ request, session }) => {
      const response = await Apify.utils.requestAsBrowser({
        url: request.url,
        headers: { "User-Agent": randomUA.generate() },
        json: true,
        ...cloudFlareUnBlocker.getRequestOptions(session)
      });
      session.setCookiesFromResponse(response);
      const { statusCode, body } = response;
      const allowedStates = new Set([200, 400, 404]);
      if (!allowedStates.has(statusCode)) {
        session.retire();
        // dont mark this request as bad, it is probably looking for working session
        request.retryCount--;
        // dont retry the request right away, wait a little bit
        await Apify.utils.sleep(5000);
        throw new Error("Session blocked, retiring.");
      }
      await handlePageFunction({ request, response, json: body }, requestQueue);
      await Apify.utils.sleep(sleep * 1000);
    },
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  // Run crawler.
  await crawler.run();
  log.info("crawler finished");

  try {
    await uploadToKeboola(getTableName(country));
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
});
