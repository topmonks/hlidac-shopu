const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const { invalidateCDN } = require("@hlidac-shopu/actors-common/product.js");
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const Apify = require("apify");
const _ = require("underscore");
const { COUNTRY, LABELS, STARTURLS } = require("./consts");
const {
  flat,
  ExtractItems,
  findArraysUrl,
  formatPrice,
  getProductRedux
} = require("./tools");

const stats = {
  offers: 0
};

const uniqueItems = new Set();

const { log } = Apify.utils;

function getTableName(country) {
  return country === COUNTRY.CZ ? "itesco" : "itesco_sk";
}

Apify.main(async () => {
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const {
    development = false,
    country = COUNTRY.CZ,
    debugLog = false,
    test
  } = await Apify.getInput();
  const requestQueue = await Apify.openRequestQueue();
  const url = country === COUNTRY.CZ ? STARTURLS.CZ : STARTURLS.SK;
  if (debugLog) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }
  await requestQueue.addRequest({
    url,
    userData: {
      label: LABELS.START
    }
  });

  /*    await requestQueue.addRequest({
        url: 'https://nakup.itesco.cz/groceries/cs-CZ/shop/ovoce-a-zelenina/ovoce/all',
        userData: {
            label: 'PAGINATION',
        },
    }); */

  const persistState = async () => {
    console.log(stats);
  };
  Apify.events.on("persistState", persistState);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    useApifyProxy: !development
  });
  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency: 10,
    maxRequestRetries: 5,
    proxyConfiguration,
    handlePageTimeoutSecs: 60,

    handlePageFunction: async ({ $, request }) => {
      log.info(`Processing ${request.url}, ${request.userData.label}`);
      if (request.userData.label === LABELS.START) {
        const script = $("body").attr("data-redux-state");
        const urlsCatHtml = JSON.parse(script);

        const startUrls = await findArraysUrl(urlsCatHtml, country);
        log.debug(`Found ${startUrls.length} on ${request.userData.label}`);
        for (const item of startUrls) {
          await requestQueue.addRequest({
            url: item.url,
            userData: {
              label: LABELS.PAGE
            }
          });
        }
      } else if (request.userData.label === LABELS.PAGE) {
        try {
          if ($(".pagination--page-selector-wrapper ul li").eq(-2)) {
            const lastPage = $(".pagination--page-selector-wrapper ul li")
              .eq(-2)
              .text();
            const parsedLastPage = parseInt(lastPage);
            if (parsedLastPage > 1 && request.url.indexOf("?page=") === -1) {
              const pagesArr = _.range(2, parsedLastPage + 1);
              for (const page of pagesArr) {
                const nextPageUrl = `${request.url}?page=${page}`;
                await requestQueue.addRequest({
                  url: nextPageUrl,
                  userData: {
                    label: LABELS.PAGINATION
                  }
                });
              }
            }
          }
          const items = await ExtractItems(
            $,
            country,
            uniqueItems,
            stats,
            request
          );
          log.debug(`Found ${items.length} storing them, ${request.url}`);
          await Apify.pushData(items);
        } catch (e) {
          // no items on the page check it out
          log.debug(`Check this url, there are no items ${request.url}`);
          await Apify.pushData({
            status: "Check this url, there are no items",
            url: request.url
          });
        }
      } else if (request.userData.label === LABELS.PAGINATION) {
        try {
          const items = await ExtractItems(
            $,
            country,
            uniqueItems,
            stats,
            request
          );
          log.debug(`Found ${items.length} storing them, ${request.url}`);
          await Apify.pushData(items);
        } catch (e) {
          // no items on the page check it out
          log.debug(`Check this url, there are no items ${request.url}`);
          await Apify.pushData({
            status: "Check this url, there are no items",
            url: request.url
          });
        }
      }
    },

    handleFailedRequestFunction: async ({ request }) => {
      log.error(`Request ${request.url} failed 4 times`);
    }
  });
  await crawler.run();
  await persistState();
  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "itesco.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola(getTableName(country));
    log.info("upload to Keboola finished");
  }
});
