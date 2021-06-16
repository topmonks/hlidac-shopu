const Apify = require("apify");
const {
  HOME_PAGE,
  BASE_URL,
  BF,
  BASE_URL_SK_BF,
  BASE_URL_CZ_BF,
  BASE_URL_SK,
  COUNTRY
} = require("./src/consts");
const {
  extendCheerio,
  handlePageFunction,
  handleFailedRequestFunction
} = require("./src/funcs");

const { log } = Apify.utils;

Apify.main(async () => {
  const input = await Apify.getInput();
  const {
    country = COUNTRY.CZ,
    type = "FULL",
    testEnv = "cloud",
    testMode = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxConcurrency = 10,
    maxRequestRetries = 5
  } = input;
  if (testMode) {
    log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }
  log.debug(
    `test mode: ${testMode}, environment: ${testEnv}, country: ${country}`
  );

  global.crawledProducts = 0;
  global.MAX_CRAWLED_PRODUCTS = 50;

  const requestQueue = await Apify.openRequestQueue();
  if (type === BF) {
    await requestQueue.addRequest({
      url: country === COUNTRY.CZ ? BASE_URL_CZ_BF : BASE_URL_SK_BF,
      userData: {
        label: BF
      }
    });
  } else {
    const rootUrl = country === COUNTRY.CZ ? BASE_URL : BASE_URL_SK;
    await requestQueue.addRequest({
      url: rootUrl,
      userData: { label: HOME_PAGE }
    });
  }
  // todo type === 'COUNT'

  const stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    categoriesDone: 0,
    items: 0,
    itemsDone: 0,
    urls: 0,
    pages: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  // const persistState = async () => {
  //     await Apify.setValue('STATS', stats).then(() => console.dir(stats));
  // };
  // Apify.events.on('persistState', persistState);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 20
    },
    ignoreSslErrors: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    handlePageFunction:
      // eslint-disable-next-line max-len
      ({ request, $, session, response }) =>
        handlePageFunction(
          requestQueue,
          request,
          extendCheerio($),
          session,
          response,
          input,
          proxyConfiguration,
          stats
        ),

    // This function is called if the page processing failed more than maxRequestRetries+1 times.
    handleFailedRequestFunction
  });
  log.info("Crawling start");
  await crawler.run();
  log.info("Crawling finished.");
  // await persistState();
  await Apify.setValue("STATS", stats).then(() =>
    log.debug(`STATS saved! ${JSON.stringify(stats)}`)
  );
  log.info(`Total products: ${global.crawledProducts}.`);

  // stats page
  // if (!testMode && type !== 'CZECHITAS') {
  //     try {
  //         const env = await Apify.getEnv();
  //         const run = await Apify.callTask(
  //             'blackfriday/status-page-store', {
  //                 datasetId: env.defaultDatasetId,
  //                 name: input.type !== 'FULL' ? 'notino-cz-bf' : 'notino-cz',
  //             }, {
  //                 waitSecs: 25,
  //             },
  //         );
  //         console.log(`Keboola upload called: ${run.id}`);
  //     } catch (e) {
  //         console.log(e);
  //     }
  //
  //     try {
  //         const env = await Apify.getEnv();
  //         let tableName = '';
  //         if (country === 'CZ' && type === 'FULL') {
  //             tableName = 'notino';
  //         } else if (country === 'SK' && type === 'FULL') {
  //             tableName = 'notino_sk';
  //         } else if (country === 'CZ' && type !== 'FULL') {
  //             tableName = 'notino_bf';
  //         } else if (country === 'SK' && type !== 'FULL') {
  //             tableName = 'notino_sk_bf';
  //         }
  //         const run = await Apify.call(
  //             'blackfriday/uploader', {
  //                 datasetId: env.defaultDatasetId,
  //                 upload: true,
  //                 actRunId: env.actorRunId,
  //                 blackFriday: input.type !== 'FULL',
  //                 tableName,
  //             }, {
  //                 waitSecs: 25,
  //             },
  //         );
  //         console.log(`Keboola upload called: ${run.id}`);
  //     } catch (e) {
  //         console.log(e);
  //     }
  // }

  log.info("ACTOR - Finished");
});
