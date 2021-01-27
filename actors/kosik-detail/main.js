const Apify = require("apify");
const cheerio = require("cheerio");

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */
/** @typedef { import("apify").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("apify").RequestQueue } RequestQueue */

const { log } = Apify.utils;

function parseMainContent($, contentSelector) {
  return {
    "@type": "WebPageElement",
    cssSelector: contentSelector,
    encodingFormat: "text/html",
    encoding: $(contentSelector).html().trim()
  };
}

function parseParameter($row) {
  return {
    "@type": "PropertyValue",
    name: $row.find("td:first-of-type").text().trim(),
    value: $row.find("td:last-of-type").text().trim()
  };
}

const parseParameters = $ => ({
  parameters: $('table[data-tid="product-detail_nutrition_table"] tr')
    .get()
    .map(x => parseParameter($(x)))
});

async function parseDetail($) {
  const $product = $('.product-detail [itemtype="http://schema.org/Product"]');
  const $offer = $product.find("[itemprop=offers]");

  if (!$product.length) {
    log.error("No linked data found");
    throw new Error("No linked data found");
  }
  const category = $(".product-detail .breadcrumbs__item--arrow")
    .get()
    .map(x => $(x).text().trim())
    .join(" > ");
  if (!category) log.warning("Category not found");
  const id = $product.find("[itemprop=productID]").text().trim();
  return {
    identifier: id,
    mainEntity: {
      "@context": "http://schema.org/",
      "@type": "Product",
      sku: id,
      name: $product.find("[itemprop=name]").text().trim(),
      description: $product
        .find("[itemprop=description] p:first-child")
        .text()
        .trim(),
      category,
      offers: [
        {
          "@type": "Offer",
          availability: $offer.find("[itemprop=availability]").attr("content"),
          itemCondition: $offer
            .find("[itemprop=itemCondition]")
            .attr("content"),
          priceCurrency: $offer
            .find("[itemprop=priceCurrency]")
            .attr("content"),
          price: $offer.find("[itemprop=price]").attr("content")
        }
      ],
      image: $product.find("[itemprop=image]").attr("src")
    },
    mainContentOfPage: [parseMainContent($, ".product-detail")],
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

function pageFunction(requests, proxyConfiguration) {
  /**
   *  @param {CheerioHandlePageInputs} context
   *  @returns {Promise<void>}
   */
  async function handlePageFunction(context) {
    const { request, response, json, body, contentType } = context;
    if (response.statusCode !== 200) {
      log.info("Status code:", response.statusCode);
    }

    const { id, part, detailUrl } = request.userData;

    if (detailUrl && detailUrl !== response.url) {
      log.info("not found", { url: detailUrl });
      return;
    }

    const result = (await Apify.getValue(id)) || {
      "@context": "http://schema.org",
      "@type": "ItemPage"
    };

    const parts = new Map([
      [
        "detail",
        async () =>
          Apify.setValue(id, {
            ...result,
            url: detailUrl,
            ...(await parseDetail(
              cheerio.load(body.toString(contentType.encoding))
            ))
          })
      ],
      [
        "hlidac-shopu",
        () => Apify.setValue(id, { ...result, ...parseHlidacShopuData(json) })
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

  return handlePageFunction;
}

class MemoIds {
  constructor() {
    this.ids = new Set();
  }

  parse(s) {
    const url = new URL(s);
    const match = url.pathname.match(/[^/]+$/);
    const id = match?.[0] ?? null;
    if (id) this.ids.add(id);
    return id;
  }

  values() {
    return this.ids.values();
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
  return `kosik_${country.toLowerCase()}_details`;
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
    proxyGroups = ["CZECH_LUMINATI"]
  } = input || {};
  const urls = products.map(({ url }) => url).filter(Boolean);

  const ids = new MemoIds();
  const requests = new Set();
  for (const url of urls) {
    const id = ids.parse(url);
    requests.add({
      url,
      retryCount: 10,
      userData: { id, part: "detail", detailUrl: url }
    });
    if (extensions) extensions.forEach(requestExtensionData(requests, id, url));
  }

  const requestList = await Apify.openRequestList(
    "kosik_detail",
    Array.from(requests),
    { persistRequestsKey: "kosik_detail" }
  );
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development
  });

  // Create crawler.
  const crawler = new Apify.CheerioCrawler({
    requestList,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries: 10,
    additionalMimeTypes: ["application/json", "text/plain"],
    handlePageFunction: pageFunction(requests, proxyConfiguration),
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  // Run crawler.
  await crawler.run();
  log.info("crawler finished");

  for (const id of ids.values()) {
    const result = await Apify.getValue(id);
    if (!result) continue;
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
