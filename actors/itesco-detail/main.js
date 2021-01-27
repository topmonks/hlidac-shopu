const Apify = require("apify");
const cheerio = require("cheerio");
const randomUA = require("modern-random-ua");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */

const { log, requestAsBrowser } = Apify.utils;

const parseMainContent = ($, contentSelector) => ({
  "@type": "WebPageElement",
  cssSelector: contentSelector,
  encodingFormat: "text/html",
  encoding: $(contentSelector).html().trim()
});

const parseParameter = $row => ({
  "@type": "PropertyValue",
  name: $row.find("td:first-of-type,h4").text().trim(),
  value: $row.find("td:last-of-type,p").text().trim()
});

const parseParameters = $ => ({
  parameters: $(`
      .tabularContent tbody tr,
      .groupItem .memo,
      .nameTextItems,
      .nameLookups,
      .statements
    `)
    .get()
    .map(x => parseParameter($(x)))
});

async function parseDetail($) {
  const data = $('script[type="application/ld+json"]')
    .get()
    .map(x => $(x).html())
    .map(JSON.parse)
    .flat();

  const productDetail = data.find(x => x["@type"] === "Product");
  if (!productDetail) {
    log.error("No linked data found");
    throw new Error("No linked data found");
  }
  const category = $(".breadcrumbs__content").text().replace(/\n/, " > ");
  if (category) productDetail.category = category;
  else log.warning("Category not found");
  return {
    breadcrumbs: data.find(x => x["@type"] === "BreadcrumbList"),
    mainEntity: productDetail,
    mainContentOfPage: [parseMainContent($, ".main__content")],
    ...parseParameters($)
  };
}

function requestExtensionData(requests, id, url) {
  const extensionHandlers = {
    "hlidac-shopu": (requests, id, url) => [
      requests.add({
        url: `https://api2.hlidacshopu.cz/detail?${new URLSearchParams({
          url
        })}`,
        retryCount: 10,
        userData: { part: "hlidac-shopu", id }
      })
    ]
  };
  return extension => {
    const handler = extensionHandlers[extension];
    if (handler) return handler(requests, id, url);
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

/**
 *  @param {CheerioHandlePageInputs} context
 *  @param requestQueue {RequestQueue}
 *  @returns {Promise<void>}
 */
async function handlePageFunction(context, requestQueue) {
  const { request, response, json, body, contentType } = context;
  if (response.statusCode !== 200) {
    log.info("Status code:", response.statusCode);
  }

  const { id, part, detailUrl, extensions, result } = request.userData;
  const parts = new Map([
    [
      "detail",
      async () =>
        requestQueue.addRequest({
          url: `https://api2.hlidacshopu.cz/detail?${new URLSearchParams({
            url: detailUrl
          })}`,
          retryCount: 10,
          userData: {
            part: "hlidac-shopu",
            extensions,
            result: {
              "@context": "http://schema.org",
              "@type": "ItemPage",
              identifier: id,
              url: detailUrl,
              ...(await parseDetail(
                cheerio.load(body.toString(contentType.encoding))
              ))
            }
          }
        })
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

  result.mainContentOfPage = result.mainContentOfPage ?? [];
  for (const ext of extensions) {
    extensionHandlers[ext]();
  }
  return result;
}

function getTableName(country) {
  return `itesco_${country.toLowerCase()}_details`;
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
    development,
    extensions = [],
    maxConcurrency = 4,
    sleep = 5,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};
  const urls = products.map(({ url }) => url);

  const requests = Array.from(
    new Set(
      urls.map(url => ({
        url,
        retryCount: 10,
        userData: { part: "detail", detailUrl: url, extensions }
      }))
    )
  );
  const requestList = await Apify.openRequestList(
    "itesco_detail",
    requests.slice(0, 100)
  );
  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  const fillRequestQueue = new Promise(async resolve => {
    for (const r of requests.slice(100)) await requestQueue.addRequest(r);
    resolve();
  });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development
  });
  const crawler = new Apify.CheerioCrawler({
    requestList,
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries: 10,
    additionalMimeTypes: ["application/json", "text/plain"],
    requestTimeoutSecs: 120,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 100
    },
    handleRequestFunction: async ({ request, session }) => {
      const response = await requestAsBrowser({
        url: request.url,
        headers: { "User-Agent": randomUA.generate() }
      });
      session.setCookiesFromResponse(response);
      const { statusCode, body, contentType } = response;
      const allowedStates = new Set([200, 400, 404]);
      if (!allowedStates.has(statusCode)) {
        session.retire();
        // dont mark this request as bad, it is probably looking for working session
        request.retryCount--;
        // dont retry the request right away, wait a little bit
        await Apify.utils.sleep(5000);
        throw new Error("Session blocked, retiring.");
      }
      await handlePageFunction(
        { request, response, body, contentType, json: body },
        requestQueue
      );
      await Apify.utils.sleep(sleep * 1000);
    },
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await Promise.all([crawler.run(), fillRequestQueue]);
  log.info("crawler finished");

  try {
    await uploadToKeboola(getTableName(country));
    log.info("upload to Keboola finished");
  } catch (err) {
    log.warning("upload to Keboola failed");
    log.error(err);
  }
});
