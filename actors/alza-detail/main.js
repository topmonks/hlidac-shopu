const Apify = require("apify");
const cheerio = require("cheerio");
const captchaSolver = require("./captchaSolver");
const { getCheerioResponse, postAnticaptcha } = require("./helpers");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

function parseParameter($row) {
  return {
    "@type": "PropertyValue",
    name: $row.find(".name").text().trim(),
    value: $row.find(".value").text().trim()
  };
}

function parseCategory($) {
  const parts = $(".breadcrumbs").text().trim().split("»");
  parts.pop(); // remove last part - name of product
  parts.shift(); // remove first part - home icon
  return { category: parts.join(" > ") };
}

async function parseDetail($, enqueueRequest) {
  const script = $(
    '#content0>.detail-page>script[type="text/javascript"]'
  ).html();
  const dataLayer =
    script &&
    JSON.parse(script.trim().replace("var dataLayer = ", "").replace(";", ""));
  if (dataLayer?.[0]) await enqueueRequest(dataLayer[0].itemID);

  const data = $('script[type="application/ld+json"]')
    .get()
    .map(x => $(x).html())
    .map(JSON.parse);

  const productDetail = data.find(x => x["@type"] === "Product");
  if (!productDetail) {
    log.error("No linked data found");
    throw new Error("No linked data found");
  }
  const { category } = parseCategory($);
  if (category) productDetail.category = category;
  else log.warning("Category not found");
  return {
    breadcrumbs: data.find(x => x["@type"] === "BreadcrumbList"),
    mainEntity: productDetail,
    mainContentOfPage: {
      "@type": "WebPageElement",
      cssSelector: "#content0",
      encodingFormat: "text/html",
      encoding: $("#content0").html().trim()
    }
  };
}

const parseParameters = $ => ({
  parameters: $(".allpar .row")
    .get()
    .map(x => parseParameter($(x)))
});

const parseImages = $ => ({
  image: $("img")
    .get()
    .map(x => $(x).data("src"))
});

const parseDescription = html => ({
  description: {
    "@type": "WebPageElement",
    cssSelector: "#popis .popis__content",
    encodingFormat: "text/html",
    encoding: html
  }
});

const parseHlidacShopuData = json => ({
  priceHistory: {
    "@type": "WebPageElement",
    cssSelector: "#hlidacshopu",
    encodingFormat: "application/json",
    encoding: JSON.stringify(json)
  }
});

function pageFunction(requestQueue, proxyConfiguration) {
  function enqueueDescriptionRequest(id) {
    return function (itemId) {
      requestQueue.addRequest({
        url:
          "https://www.alza.cz/Services/EShopService.svc/GetCommodityDetailLegend",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Language": "cs-CZ"
        },
        uniqueKey: itemId,
        payload: JSON.stringify({
          code: itemId,
          id: -1,
          showParentLegend: false
        }),
        userData: { id, part: "popis" }
      });
    };
  }

  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  return async function handlePageFunction(context) {
    const { request, response, json, body, contentType, session } = context;
    let { $ } = context;
    if (response.statusCode !== 200) {
      log.info("Status code:", response.statusCode);
    }
    if ($(".captcha-mid").length) {
      const siteKey = $("[data-sitekey]").data("sitekey");
      // We need the url on http://validate.perfdrive.com
      const { href: responseUrl } = response.request.uri;
      // get solution from anticaptcha
      const solution = await captchaSolver.getSolution(
        siteKey,
        responseUrl,
        session.userData.userAgent
      );
      if (!solution) throw new Error("Could not get anticaptcha solution");
      // Submit the solution to http://validate.perfdrive.com
      await postAnticaptcha(responseUrl, session, solution, proxyConfiguration);
      // Get original request
      $ = await getCheerioResponse(request.url, session, proxyConfiguration);
    }

    if ($("h1").eq(0).text() === "403 Forbidden") {
      await Apify.utils.sleep(5000);
      request.retryCount--;
      session.isBlocked();
      throw new Error("Access Denied");
    }

    const { id, part, detailUrl } = request.userData;
    const result = (await Apify.getValue(id)) ?? {
      "@context": "http://schema.org",
      "@type": "ItemPage",
      identifier: id
    };

    const parts = new Map([
      [
        "detail",
        async () =>
          Apify.setValue(id, {
            ...result,
            url: detailUrl,
            ...(await parseDetail(
              cheerio.load(body.toString(contentType.encoding)),
              enqueueDescriptionRequest(id)
            ))
          })
      ],
      [
        "parametry",
        () =>
          Apify.setValue(id, {
            ...result,
            ...parseParameters(cheerio.load(json.Data, {}, false))
          })
      ],
      [
        "fotovideo",
        () =>
          Apify.setValue(id, {
            ...result,
            ...parseImages(cheerio.load(json.Data, {}, false))
          })
      ],
      [
        "popis",
        () =>
          Apify.setValue(id, { ...result, ...parseDescription(json.d.Value) })
      ],
      [
        "hlidac-shopu",
        () => Apify.setValue(id, { ...result, ...parseHlidacShopuData(json) })
      ]
    ]);

    const partHandler = parts.get(part);
    if (partHandler) await partHandler();

    session.setCookiesFromResponse(response);
  };
}

function getTableName(country) {
  return `alza_${country.toLowerCase()}_details`;
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

const commonHeaders = {
  "Accept-Language": "cs,sk;q=0.8,en-US;q=0.5,en;q=0.3",
  "Upgrade-Insecure-Requests": 1,
  "User-Agent":
    "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/87.0.4280.141 Safari/537.36",
  Referer: "https://www.google.com/"
};

function detailPage(url, id) {
  return {
    url,
    retryCount: 10,
    headers: {
      ...commonHeaders
    },
    userData: { id, part: "detail", detailUrl: url }
  };
}

function detailTab(id, tabType) {
  return {
    url: "https://www.alza.cz/Api/DetailFull/LoadDetailTab",
    method: "POST",
    retryCount: 10,
    headers: {
      "Content-Type": "application/json",
      ...commonHeaders
    },
    payload: JSON.stringify({
      commodityId: id,
      tabType,
      commodityViewType: 0
    }),
    uniqueKey: `${id}:${tabType}`,
    userData: { id, part: tabType }
  };
}

class MemoIds {
  constructor() {
    this.ids = new Set();
  }

  parse(s) {
    const url = new URL(s);
    const match = url.pathname.match(/d(\d+)\./);
    const id = match?.[1] ?? url.searchParams.get("dq");
    if (id) this.ids.add(id);
    return id;
  }

  values() {
    return this.ids.values();
  }
}

function requestExtensionData(requestQueue, id, url) {
  const extensionHandlers = {
    "hlidac-shopu": (requestQueue, id, url) => [
      requestQueue.addRequest({
        url: `https://api2.hlidacshopu.cz/detail?${new URLSearchParams({
          url
        })}`,
        retryCount: 10,
        headers: {
          ...commonHeaders
        },
        userData: { part: "hlidac-shopu", id }
      })
    ]
  };
  return extension => {
    const handler = extensionHandlers[extension];
    if (handler) return handler(requestQueue, id, url);
  };
}

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

  result.mainEntity = result.mainEntity ?? {
    "@error": "Linked data not found"
  };
  result.mainEntity.additionalProperty = result.parameters;
  result.parameters = undefined;

  result.image = result.image ?? [];
  result.mainEntity.image = Array.from(
    new Set([result.mainEntity.image, ...result.image]).values()
  );
  result.image = undefined;

  result.mainContentOfPage = [
    result.mainContentOfPage,
    result.description
  ].filter(Boolean);
  result.description = undefined;

  for (const ext of extensions) {
    extensionHandlers[ext]();
  }
  return result;
}

Apify.main(async () => {
  const input = await Apify.getInput();

  const {
    products = [],
    country = "cz",
    development,
    extensions,
    maxConcurrency = 1,
    proxyGroups = ["CZECH_LUMINATI"],
    proxyCountry
  } = input || {};
  const urls = products.map(({ url }) => url);

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  const ids = new MemoIds();

  for (const url of urls) {
    const id = ids.parse(url);
    await requestQueue.addRequest(detailPage(url, id));
    await requestQueue.addRequest(detailTab(id, "parametry"));
    await requestQueue.addRequest(detailTab(id, "fotovideo"));
    if (extensions)
      await Promise.all(
        extensions.map(requestExtensionData(requestQueue, id, url)).flat()
      );
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development,
    country: proxyCountry
  });

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries: 10,
    additionalMimeTypes: ["application/json", "text/plain"],
    ignoreSslErrors: true,
    requestTimeoutSecs: 120,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 50
    },
    handlePageFunction: pageFunction(requestQueue, proxyConfiguration),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  // Run crawler.
  await crawler.run();
  log.info("crawler finished");

  for (const id of ids.values()) {
    const result = await Apify.getValue(id);
    await Apify.pushData(postprocess(result, extensions));
  }
  log.info("datasets stored");

  try {
    await uploadToKeboola(getTableName(country));
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
});
