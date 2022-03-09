import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { gotScraping } from "got-scraping";
import { URLSearchParams } from "url";
import { COUNTRY, BASE_URL_CZ, BASE_URL_SK } from "./src/consts.js";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

const s3 = new S3Client({ region: "eu-central-1" });

const {
  utils: { log }
} = Apify;

let stats = {};
const processedIds = new Set();

Apify.main(async () => {
  log.info("ACTOR - start");

  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    country = COUNTRY.CZ,
    type = "FULL",
    debug = false,
    development = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 5,
    maxRequestRetries = 3,
    bfUrls = [],
    customTableName = null
  } = input ?? {};
  if (development || debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  stats = (await Apify.getValue("STATS")) || {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0
  };

  const requestQueue = await Apify.openRequestQueue();
  const crawlContext = {
    requestQueue,
    baseUrl: country === COUNTRY.CZ ? BASE_URL_CZ : BASE_URL_SK,
    development,
    stats,
    country
  };

  const persistState = async () => {
    await Apify.setValue("STATS", crawlContext.stats).then(() =>
      log.debug("STATS saved!")
    );
    log.info(JSON.stringify(crawlContext.stats));
  };
  Apify.events.on("persistState", persistState);

  const rootUrl = country === COUNTRY.CZ ? BASE_URL_CZ : BASE_URL_SK;

  if (type === "BF") {
    for (const url of bfUrls) {
      await requestQueue.addRequest({
        url,
        userData: { label: "LIST" }
      });
      crawlContext.stats.urls += 1;
    }
  } else if (type === "TEST") {
    await requestQueue.addRequest({
      url: "https://www.okay.cz/tv-s-uhloprickou-55-139-cm/",
      userData: { label: "LIST" }
    });
  } else {
    const params = {
      page: 1
    };
    const url = `${rootUrl}/collections?${new URLSearchParams(params)}`;
    await requestQueue.addRequest({
      url: `${rootUrl}/collections`,
      userData: {
        label: "COLLECTIONS",
        defaultUrl: `${rootUrl}/collections`,
        params
      }
    });
  }

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: development ? 1 : maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    handleRequestFunction: async context => {
      const { request, session } = context;
      const { defaultUrl, label, title, params } = request.userData;

      log.info(`Processing ${label}: ${request.url}`);
      const requestOptions = {
        url: request.url,
        proxyUrl: proxyConfiguration.newUrl(session.id),
        throwHttpErrors: false,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          // If you want to use the cookieJar.
          // This way you get the Cookie headers string from session.
          Cookie: session.getCookieString()
        }
      };

      const response = await gotScraping(requestOptions);

      // Status code check
      if (![200, 404].includes(response.statusCode)) {
        session.retire();
        request.retryCount--;
        throw new Error(`We got blocked by target on ${request.url}`);
      }

      const responseData = JSON.parse(response.body);

      switch (label) {
        case "COLLECTIONS":
          if (responseData.collections.length > 0) {
            const shop =
              country.toLowerCase() === "cz"
                ? "okay-elektro-cz.myshopify.com"
                : "okay-dev-sk.myshopify.com";
            for (const collection of responseData.collections) {
              const newParams = {
                shop,
                page: 1,
                limit: 50,
                sort: "price-ascending",
                collection_scope: collection.id,
                product_available: false,
                variant_available: false,
                check_cache: false,
                sort_first: "available"
              };
              const url = `https://services.mybcapps.com/bc-sf-filter/filter?${new URLSearchParams(
                newParams
              )}`;
              await requestQueue.addRequest({
                url,
                userData: {
                  label: "COLLECTION",
                  title: collection.title,
                  params: newParams
                }
              });
            }
            log.info(`Found ${responseData.collections.length}x collections`);
            //Check for another collections on next page
            params.page = params.page + 1;
            await requestQueue.addRequest(
              {
                url: `${defaultUrl}?${new URLSearchParams(params)}`,
                userData: {
                  label: "COLLECTIONS",
                  defaultUrl,
                  params
                }
              },
              { forefront: false }
            );
          }
          break;
        case "COLLECTION":
          const paginationCount = Math.ceil(
            responseData.total_product / params.limit
          );
          log.info(`Found ${responseData.products.length}x products`);
          // we don't need to block pushes, we will await them all at the end
          const requests = [];
          for (const product of responseData.products) {
            const item = {};
            item.itemId = product.id;
            /*item.itemIdOld = product.original_tags
              .find(v => v.includes("SSID"))
              .split("-")[1];*/
            item.itemUrl = `${rootUrl}/products/${product.handle}`;
            item.img = product.images["1"];
            item.itemName = product.title;
            item.originalPrice =
              product.compare_at_price_max === 0
                ? product.price_max
                : product.compare_at_price_max;
            item.currentPrice = product.price_max;
            item.discounted = product.compare_at_price_max > product.price_max;
            item.currency = country === COUNTRY.CZ ? "CZK" : "EUR";
            item.category = product.product_type;
            item.inStock = product.available;

            if (item.itemId !== null && item.currentPrice !== null) {
              crawlContext.stats.totalItems += 1;
              if (!processedIds.has(item.itemId)) {
                processedIds.add(item.itemId);
                requests.push(Apify.pushData(item), uploadToS3v2(s3, item));
                crawlContext.stats.items += 1;
              } else {
                crawlContext.stats.itemsDuplicity += 1;
              }
            }
          }
          log.info(`Found ${requests.length / 2} unique products`);
          // await all requests, so we don't end before they end
          await Promise.allSettled(requests);

          if (paginationCount > 1 && params.page === 1) {
            log.info(`Adding ${paginationCount - 1}x pagination pages `);
            for (let i = 2; i <= paginationCount; i++) {
              params.page = i;
              const url = `https://services.mybcapps.com/bc-sf-filter/filter?${new URLSearchParams(
                params
              )}`;
              await requestQueue.addRequest(
                {
                  url,
                  userData: {
                    label: "COLLECTION",
                    title,
                    params
                  }
                },
                { forefront: true }
              );
            }
          }
          break;
      }
    },
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });
  /*  const crawler = new Apify.PlaywrightCrawler({
      requestQueue,
      proxyConfiguration,
      maxConcurrency: development ? 1 : maxConcurrency,
      maxRequestRetries,
      useSessionPool: true,
      persistCookiesPerSession: true,
      navigationTimeoutSecs: 120,
      handlePageTimeoutSecs: 600,
      launchContext: {
        useChrome: true,
        launchOptions: {
          headless: !development
        }
      },
      handlePageFunction: async context => {
        const { request, response, page } = context;
        const {
          url,
          userData: { label }
        } = request;
        if (label === "START") {
          await page.waitForSelector("li.nav-nested__link-parent");
        } else {
          await page.waitForLoadState("networkidle", { timeout: 0 });
        }
        //await page.waitForSelector(".product-box__price-bundle");
        //await page.waitForSelector("ul.pagination");
        const body = await page.content();
        const $ = cheerio.load(body);
        switch (label) {
          case "LIST":
            await handleList($, crawlContext);
            break;
          case "DETAIL":
            const product = await handleDetail($, crawlContext, country);
            if (product.itemId !== null && product.currentPrice !== null) {
              crawlContext.stats.totalItems += 1;
              if (!processedIds.has(product.itemId)) {
                processedIds.add(product.itemId);
                promiseList.push(
                  Apify.pushData(product),
                  uploadToS3(
                    s3,
                    `okay.${country.toLowerCase()}`,
                    s3FileNameSync(product),
                    "jsonld",
                    toProduct(product, {})
                  )
                );
                crawlContext.stats.items += 1;
                if (promiseList.length >= 100) {
                  await Promise.all(promiseList);
                  promiseList = [];
                }
              } else {
                crawlContext.stats.itemsDuplicity += 1;
              }
            }
            break;
          default:
            await handleStart($, crawlContext);
        }
      },
      handleFailedRequestFunction: async ({ request }) => {
        stats.failed++;
        log.error(`Request ${request.url} failed multiple times`, request);
      }
    });*/
  /*  const crawler = new Apify.CheerioCrawler({
      requestQueue,
      proxyConfiguration,
      useSessionPool: true,
      persistCookiesPerSession: true,
      maxConcurrency,
      handlePageTimeoutSecs: 600,
      handlePageFunction: async context => {
        const {
          url,
          userData: { label }
        } = context.request;
        log.debug("Page opened.", { label, url });
        context.requestQueue = requestQueue;
      }
    });*/

  log.info("Starting the crawl.");
  await crawler.run();

  log.info("Crawl finished.");

  await Apify.setValue("STATS", crawlContext.stats);
  log.info(JSON.stringify(crawlContext.stats));

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `okay.${country.toLowerCase()}`
    );
    log.info(`invalidated Data CDN: okay.${country.toLowerCase()}`);

    let tableName = `okay_${country.toLowerCase()}${
      type === "BF" ? "_bf" : ""
    }`;
    tableName = customTableName ? customTableName : tableName;
    await uploadToKeboola(tableName);
    log.info(`upload to Keboola finished: ${tableName}`);
  }

  log.info("ACTOR - Finished");
});
