const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const {
  invalidateCDN,
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const tools = require("./src/tools");
const { LABELS, COUNTRY_TYPE, HEADER, BASE_URL } = require("./src/const");

const { log, requestAsBrowser } = Apify.utils;

const ROOT_URL = "https://aaaauto.cz/ojete-vozy";
const ROOT_URL_SK = "https://www.aaaauto.sk/ojazdene-vozidla/";

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
    maxRequestRetries,
    maxConcurrency,
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
        const offers = $(".card").toArray();
        // we don't need to block pushes, we will await them all at the end
        const requests = [];
        let sleepTotal = 0;
        for (const offer of offers) {
          const $offer = $(offer);
          const link = $offer.find("a.fullSizeLink").attr("href");
          const figure = $offer.find("figure");
          const url = new URL(link, rootUrl);
          const itemId = url.searchParams.get("id");
          const itemName = $offer.find("h2 a").text().trim();
          const arr = itemName.split(",");

          const currentPrice = $offer
            .find("span[id*=garageHeart]")
            .attr("data-price");
          const actionPrice = tools.extractPrice(
            $offer.find(".carPrice h3.error:not(.hide)").text()
          );
          let originalPrice = $offer
            .find(".carPrice .darkGreyAlt")
            .find(".hix")
            .remove();
          originalPrice = tools.extractPrice(
            $offer.find(".carFeatures p").text()
          );

          const description = $offer.find(".carFeatures p").text().trim();
          const carFeatures = $offer
            .find(".carFeaturesList li")
            .toArray()
            .map(feature => {
              return $(feature).text();
            });

          const [km, transmission, fuelType, engine] = carFeatures;
          const product = {
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
            engine
          };
          requests.push(
            Apify.pushData(product),
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
          sleepTotal += tools.getHumanDelayMillis(250, 950);
        }
        log.debug(`Found ${requests.length / 2} cars, ${request.url}`);
        // await all requests, so we don't end before they end
        await Promise.allSettled(requests);
        await Apify.utils.sleep(sleepTotal);
      }
    }
  });
  await crawler.run();

  log.info("Crawler finished.");

  if (!development) {
    try {
      await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "aaaauto.cz");
      log.info("invalidated Data CDN");
      await uploadToKeboola(country !== "CZ" ? "aaaauto_sk" : "aaaauto_cz");
      log.info("upload to Keboola finished");
    } catch (e) {
      console.log(e);
    }
  }

  console.log("Finished.");
});
