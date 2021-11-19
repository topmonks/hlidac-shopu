const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const {
  invalidateCDN,
  toProduct,
  uploadToS3,
  s3FileName,
  shopName
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const tools = require("./src/tools");
const { LABELS, COUNTRY_TYPE, HEADER, BASE_URL } = require("./src/const");

const { log, requestAsBrowser } = Apify.utils;

const ROOT_URL = "https://www.aaaauto.cz/black-friday/?category=92&limit=50";
const ROOT_URL_SK = "https://www.aaaauto.sk/black-friday/?category=92&limit=50";

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    country = COUNTRY_TYPE.CZ
  } = input ?? {};
  const rootUrl = country === COUNTRY_TYPE.CZ ? ROOT_URL : ROOT_URL_SK;
  const shop = await shopName(rootUrl);
  const requestQueue = await Apify.openRequestQueue();

  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  await requestQueue.addRequest({
    url: rootUrl,
    userData: {
      label: LABELS.START
    }
  });
  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 20
    },
    persistCookiesPerSession: true,
    requestTimeoutSecs: 300,
    handlePageTimeoutSecs: 300,
    handlePageFunction: async ({ request, $ }) => {
      log.info(`Scraping page ${request.url}`);
      if (request.userData.label === "START") {
        const pages = $("nav.pagenav li");
        const lastPage = pages
          .eq(pages.length - 2)
          .find("a")
          .text()
          .trim();
        await Array.from(
          { length: lastPage },
          (_value, index) => index + 1
        ).map(async pageNumber => {
          await requestQueue.addRequest({
            url: BASE_URL(country, pageNumber),
            userData: { label: LABELS.PAGE, pageNumber }
          });
        });
      } else if (request.userData.label === "PAGE") {
        const offers = $(".card");
        const products = await Promise.allSettled(
          offers.map(async function () {
            try {
              const item = $(this);
              const link = item.find("a.fullSizeLink").attr("href");
              const figure = item.find("figure");
              const url = new URL(link, rootUrl);
              const itemId = url.searchParams.get("id");
              const itemName = item.find("h2 a").text().trim();
              const arr = itemName.split(",");

              const currentPrice = item
                .find("span[id*=garageHeart]")
                .attr("data-price");
              const actionPrice = tools.extractPrice(
                item.find(".carPrice h3.error:not(.hide)").text()
              );
              let originalPrice = item
                .find(".carPrice .darkGreyAlt")
                .find(".hix")
                .remove();
              originalPrice = tools.extractPrice(
                item.find(".carFeatures p").text()
              );

              const description = item.find(".carFeatures p").text().trim();
              const carFeatures = item
                .find(".carFeaturesList li")
                .toArray()
                .map(feature => {
                  return $(feature).text();
                });

              const [km, transmission, fuelType, engine] = carFeatures;
              return {
                itemUrl: link,
                itemId,
                description,
                img: figure.length > 0 ? figure.find("img").attr("src") : null,
                itemName: arr[0],
                currentPrice,
                originalPrice,
                currency: country === COUNTRY_TYPE.CZ ? "Kč" : "Eur",
                actionPrice,
                discounted: !!originalPrice,
                year: arr[1] ? arr[1] : undefined,
                km,
                transmission,
                fuelType,
                engine,
                shop,
                slug: await s3FileName({ itemUrl: link })
              };
            } catch (e) {
              log.error(e.message);
              log.error(`Products extraction failed on url: ${request.url}`);
            }
          })
        );
        // we don't need to block pushes, we will await them all at the end
        const allFulfilledProducts = products
          .filter(p => p.status === "fulfilled")
          .map(p => p.value);
        const requests = [Apify.pushData(allFulfilledProducts)];
        let sleepTotal = 0;
        for (const product of allFulfilledProducts) {
          requests.push(
            uploadToS3(
              s3,
              "aaaauto.cz",
              await s3FileName(product),
              "jsonld",
              toProduct(
                {
                  ...product,
                  category: "",
                  inStock: true
                },
                {}
              )
            )
          );
        }
        sleepTotal += tools.getHumanDelayMillis(250, 950);
        log.debug(`Found ${allFulfilledProducts.length} cars, ${request.url}`);
        // await all requests, so we don't end before they end
        await Promise.allSettled(requests);
        await Apify.utils.sleep(sleepTotal);
      }
    },
    handleFailedRequestFunction: async ({ error, request, body }) => {
      log.error(`Request ${request.url} failed multiple times`, request);
      console.log(request.statusCode);
      console.log(error);
      console.log(body);
    }
  });
  await crawler.run();

  log.info("Crawler finished.");

  if (!development) {
    try {
      await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "aaaauto.cz");
      log.info("invalidated Data CDN");
      await uploadToKeboola(country !== "CZ" ? "aaaauto_sk_bf" : "aaaauto_cz_bf");
      log.info("upload to Keboola finished");
    } catch (e) {
      console.log(e);
    }
  }

  console.log("Finished.");
});
