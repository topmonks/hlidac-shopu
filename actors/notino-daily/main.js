import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import {
  extendCheerio,
  handlePageFunction,
  handleFailedRequestFunction
} from "./src/funcs.js";
import {
  HOME_PAGE,
  CATEGORY_PAGE,
  BASE_URL,
  BF,
  BASE_URL_SK_BF,
  BASE_URL_CZ_BF,
  BASE_URL_SK,
  COUNTRY
} from "./src/consts.js";

const { log } = Apify.utils;

let stats = {};

Apify.main(async () => {
  log.info("ACTOR - start");

  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const input = await Apify.getInput();
  const {
    country = COUNTRY.CZ,
    type = ActorType.FULL,
    debug = false,
    development = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 10,
    maxRequestRetries = 3
  } = input ?? {};
  if (debug) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }
  log.debug(
    `development: ${development}, debug: ${debug}, country: ${country}`
  );

  const crawledProducts = 0;

  const requestQueue = await Apify.openRequestQueue();
  if (type === BF) {
    await requestQueue.addRequest({
      url: country === COUNTRY.CZ ? BASE_URL_CZ_BF : BASE_URL_SK_BF,
      userData: {
        label: BF
      }
    });
  } else if (type === "TEST") {
    const rootUrl = country === COUNTRY.CZ ? BASE_URL : BASE_URL_SK;
    await requestQueue.addRequest({
      url: "https://www.notino.cz/kosmetika/pletova-kosmetika/pletove-kremy/",
      userData: { label: CATEGORY_PAGE }
    });
  } else {
    const rootUrl = country === COUNTRY.CZ ? BASE_URL : BASE_URL_SK;
    await requestQueue.addRequest({
      url: rootUrl,
      userData: { label: HOME_PAGE }
    });
  }

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    categoriesDone: 0,
    items: 0,
    pages: 0,
    itemsDuplicity: 0
  };

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency: development ? 1 : maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 1000
    },
    ignoreSslErrors: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    handlePageFunction:
      // eslint-disable-next-line max-len
      async ({ request, $, session, response }) => {
        await handlePageFunction(
          requestQueue,
          request,
          extendCheerio($),
          session,
          response,
          input,
          proxyConfiguration,
          stats,
          crawledProducts
        );
      },
    // This function is called if the page processing failed more than maxRequestRetries+1 times.
    handleFailedRequestFunction
  });

  log.info("Crawling start");
  await crawler.run();
  log.info("Crawling finished.");
  // await persistState();
  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));
  log.info(`Total products: ${crawledProducts}.`);

  if (!development && type !== "CZECHITAS") {
    const tableName = `notino${
      country === COUNTRY.CZ ? "" : "_" + country.toLowerCase()
    }${type === "BF" ? "_bf" : ""}`;
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `notino.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");
    await uploadToKeboola(tableName);
    log.info("upload to Keboola finished");
  }

  log.info("ACTOR - Finished");
});
