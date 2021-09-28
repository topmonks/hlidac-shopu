const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const {
  toProduct,
  s3FileName,
  uploadToS3,
  invalidateCDN
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const { log } = Apify.utils;
const { URL, URLSearchParams } = require("url");
const { gotScraping } = require("got-scraping");

const COUNTRY = {
  CZ: "CZ",
  SK: "SK",
  PL: "PL",
  HU: "HU",
  DE: "DE",
  AT: "AT"
};

let stats = {};
const processedIds = new Set();

const makeListingUrl = (
  countryCode,
  productQuery,
  currentPage,
  pageSize = 100
) =>
  `https://products.dm.de/product/${countryCode.toLowerCase()}/search?${new URLSearchParams(
    {
      productQuery,
      currentPage,
      pageSize,
      purchasableOnly: false,
      hideFacets: false,
      hideSorts: true
    }
  )}`;

const createProductUrl = (country, url) => {
  switch (country.toUpperCase()) {
    case COUNTRY.SK:
      return new URL(url, "https://mojadm.sk").href;
    default:
      return new URL(url, `https://dm.${country.toLowerCase()}`).href;
  }
};

function* traverseCategories(categories, names = []) {
  for (const category of categories) {
    if (category.subcategories) {
      yield* traverseCategories(category.subcategories, [
        ...names,
        category.name
      ]);
    } else {
      names = [...names, category.name];
    }
    category.breadcrumbs = names.filter(x => x !== "null").join(" > ");
    yield category;
  }
}

function* paginateResults(category) {
  const length = Math.ceil(category.count / 100);
  for (let i = 1; i <= length; i++) {
    yield i;
  }
}

function getTableName(country) {
  return `dm_${country.toLowerCase()}`;
}

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    country = COUNTRY.CZ,
    productQuery = ":allCategories"
  } = input ?? {};

  if (debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  };

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest({
    url: makeListingUrl(country, productQuery, 1, 1),
    userData: {
      country,
      productQuery,
      step: "START"
    }
  });

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 10,
    maxRequestRetries: 1,
    handleRequestFunction: async context => {
      const { request } = context;
      const {
        url,
        userData: { country, step, category }
      } = request;

      const response = await gotScraping({
        responseType: "json",
        url
      });
      const { statusCode, body } = response;
      if (statusCode !== 200) {
        return log.info(body.toString());
      }

      const { pagination, products, categories } = body;
      if (step === "START") {
        log.info("Pagination info", pagination);
        // we are traversing recursively from leaves to trunk
        for (const category of traverseCategories(categories)) {
          log.debug(`Found category ${category.name}`);
          stats.categories++;
          for (const page of paginateResults(category)) {
            // we need to await here to prevent higher categories
            // to be enqueued sooner than sub-categories
            await requestQueue.addRequest({
              url: makeListingUrl(country, category.productQuery, page),
              userData: {
                country,
                category: category.breadcrumbs
              }
            });
          }
        }
      } else {
        // we don't need to block pushes, we will await them all at the end
        const requests = [];
        stats.items += products.length;
        for (const item of products) {
          if (!processedIds.has(item.gtin)) {
            processedIds.add(item.gtin);
            stats.itemsUnique++;
            const detail = parseItem(item);
            const slug = await s3FileName(detail);
            requests.push(
              // push data to dataset to be ready for upload to Keboola
              Apify.pushData({ ...detail, slug }),
              // upload JSON+LD data to CDN
              uploadToS3(
                s3,
                `dm.${country.toLowerCase()}`,
                slug,
                "jsonld",
                toProduct(detail, {
                  brand: item.brandName,
                  name: item.name,
                  gtin: item.gtin
                })
              )
            );
          } else {
            stats.itemsDuplicity++;
          }
        }
        log.debug(
          `Found ${requests.length / 2} unique products at ${request.url}`
        );

        // await all requests, so we don't end before they end
        await Promise.allSettled(requests);

        function parseItem(p) {
          return {
            itemId: p.gtin,
            itemName: `${p.brandName} ${p.name}`,
            itemUrl: createProductUrl(country, p.relativeProductUrl),
            img: p.links
              .filter(x => x.rel.startsWith("productimage"))
              .map(x => x.href)
              .pop(),
            inStock: !p.notAvailable,
            currentPrice: p.price,
            originalPrice: p.isSellout
              ? p.selloutPriceLocalized
                  .trim()
                  .replace(/[^\d,]+/g, "")
                  .replace(",", ".")
              : null,
            currency: p.priceCurrencyIso,
            category,
            discounted: p.isSellout
          };
        }
      }
    },
    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `dm.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    await uploadToKeboola(getTableName(country));
  }

  log.info("Finished.");
});
