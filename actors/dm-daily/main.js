const { S3Client } = require("@aws-sdk/client-s3");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const {
  toProduct,
  s3FileName,
  uploadToS3,
  invalidateCDN,
  currencyToISO4217
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

const getCountrySlug = country => {
  switch (country.toUpperCase()) {
    case COUNTRY.CZ:
      return "cs-cz";
    case COUNTRY.SK:
      return "sk-sk";
    case COUNTRY.HU:
      return "hu-hu";
    case COUNTRY.DE:
      return "de-de";
    case COUNTRY.AT:
      return "de-at";
  }
};

const getCategoryUrlSlug = country => {
  return `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(
    country
  )}/?view=navigation&json`;
};

const getCategoryId = (country, categorySlug) => {
  return `https://content.services.dmtech.com/rootpage-dm-shop-${getCountrySlug(
    country
  )}${categorySlug}/?json`;
};

const makeListingUrl = (
  countryCode,
  productQuery,
  currentPage,
  pageSize = 100
) =>
  `https://product-search.services.dmtech.com/${countryCode.toLowerCase()}/search/static?${new URLSearchParams(
    {
      ...productQuery,
      pageSize,
      currentPage,
      sort: "price_asc",
      purchasable: true,
      type: "search-static"
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
    if (category.children) {
      yield* traverseCategories(category.children, [...names, category.title]);
    } else {
      names = [...names, category.title];
    }
    category.breadcrumbs = names.filter(x => x !== "null").join(" > ");
    yield category;
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
    type = "FULL"
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

  if (type === "FULL") {
    await requestQueue.addRequest({
      url: getCategoryUrlSlug(country),
      userData: {
        country,
        productQuery: "",
        step: "START"
      }
    });
  } else if (type === "TEST") {
    //const productQuery = { "allCategories.id": "020800" };
    const productQuery = { "brandName": "SEINZ." };
    await requestQueue.addRequest({
      url: makeListingUrl(country, productQuery, 0),
      userData: {
        country,
        category: "test > test",
        categoryId: "020800"
      }
    });
  }

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 10,
    maxRequestRetries: 1,
    handleRequestFunction: async context => {
      const { request } = context;
      const {
        url,
        userData: { country, step, category, productQuery }
      } = request;
      const response = await gotScraping({
        responseType: "json",
        url
      });
      const { statusCode, body } = response;
      if (statusCode !== 200) {
        return log.info(body.toString());
      }

      const { type, navigation } = body;
      if (step === "START") {
        log.info("Pagination info", type);
        const { children } = navigation;
        // we are traversing recursively from leaves to trunk
        for (const category of traverseCategories(children)) {
          log.debug(
            `Found category ${category.title} at link: ${category.link}`
          );
          stats.categories++;
          // we need to await here to prevent higher categories
          // to be enqueued sooner than sub-categories
          await requestQueue.addRequest({
            url: getCategoryId(country, category.link),
            userData: {
              country,
              category: category.breadcrumbs.toString(),
              step: "CATEGORY"
            }
          });
        }
      } else if (step === "CATEGORY") {
        const { mainData } = body;
        const result = mainData
          .filter(x => x.query)
          .map(x => x.query.query)
          .shift();

        if (result) {
          let tempProductQuery = {};
          const resultValue = result.split(":")[3];
          if (result.includes(":allCategories") && resultValue) {
            tempProductQuery = { "allCategories.id": resultValue };
          } else if (result.includes(":brand") && resultValue) {
            const brand = resultValue.split("|")[0];
            tempProductQuery = { "brandName": brand };
          }
          await requestQueue.addRequest({
            url: makeListingUrl(country, tempProductQuery, 0),
            userData: {
              country,
              category,
              productQuery: tempProductQuery
            }
          });
        }
      } else {
        const { products, count, currentPage, totalPages } = body;
        // we don't need to block pushes, we will await them all at the end
        const requests = [];
        stats.items += products.length;
        if (products.length > 0) {
          if (currentPage === 0 && totalPages > 1) {
            for (let i = 1; i < totalPages; i++) {
              // we need to await here to prevent higher categories
              // to be enqueued sooner than sub-categories
              await requestQueue.addRequest(
                {
                  url: makeListingUrl(country, productQuery, i),
                  userData: {
                    country,
                    category
                  }
                },
                { forefront: true }
              );
            }
          }
          for (const item of products) {
            if (!processedIds.has(item.gtin)) {
              processedIds.add(item.gtin);
              stats.itemsUnique++;
              const detail = parseItem(item);
              const slug = await s3FileName(detail);
              requests.push(
                // push data to dataset to be ready for upload to Keboola
                Apify.pushData(detail),
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
            //console.log(p);
            return {
              itemId: p.gtin,
              itemName: `${p.brandName} ${p.name}`,
              itemUrl: createProductUrl(country, p.relativeProductUrl),
              img: p.imageUrlTemplates[0].replace(
                "{transformations}",
                "f_auto,q_auto,c_fit,w_260,h_270"
              ),
              inStock: p.purchasable,
              currentPrice: p.price.value,
              originalPrice: p.isSellout
                ? parseFloat(
                    p.selloutPrice.formattedValue
                      .trim()
                      .replace(/[^\d,]+/g, "")
                      .replace(",", ".")
                  )
                : null,
              currency: currencyToISO4217(p.price.currencySymbol),
              category,
              discounted: p.isSellout
            };
          }
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
