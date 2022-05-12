import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import { LABELS, COUNTRY } from "./const.js";
import { getTableName, scrapProducts, getRootUrl } from "./tools.js";

const { log } = Apify.utils;

async function scrapeCategoryItems({ $, crawler }) {
  const categoryItems = $(".list-categories__item__block").toArray();
  for (const cat of categoryItems) {
    const url = $(cat).attr("href");
    await crawler.requestQueue.addRequest({
      url,
      userData: {
        label: LABELS.CATEGORY,
        mainCategory: $(cat).find("h3").text()?.trim()
      }
    });
  }
}

async function scrapeCategory({ $, request, crawler }, { userInput, s3 }) {
  const { mainCategory } = request.userData;
  let categories = $(".list-categories__item__block").toArray();
  if (categories.length === 0) {
    categories = $(".list-categories-with-article__box").toArray();
  }
  if (categories.length === 0) {
    await scrapProducts({ $, s3, userInput });
    const nextPagination = $("a.in-paging__control__item--arrow-next");
    if (nextPagination.length > 0) {
      const paginationUrl = `https://mountfield.${userInput.country.toLocaleLowerCase()}${nextPagination.attr(
        "href"
      )}`;
      await crawler.requestQueue.addRequest({
        url: paginationUrl,
        userData: {
          label: LABELS.CATEGORY,
          mainCategory
        }
      });
      log.info(`Found pagination page ${paginationUrl}`);
    }
  } else {
    for (const cat of categories) {
      const url = $(cat).attr("href");
      await crawler.requestQueue.addRequest({
        url,
        userData: {
          label: LABELS.CATEGORY,
          mainCategory
        }
      });
    }
    log.info(`Found categories ${categories.length}`);
  }
}

Apify.main(async function main() {
  rollbar.init();
  const userInput = await Apify.getInput();
  const {
    development = false,
    debugLog = false,
    country = COUNTRY.CZ,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL,
    bfUrl = "https://www.mountfield.cz/black-friday"
  } = userInput ?? {};
  const requestQueue = await Apify.openRequestQueue();
  if (type === ActorType.FULL) {
    await requestQueue.addRequest({
      url: getRootUrl(userInput),
      userData: {
        label: LABELS.START
      }
    });
  } else if (type === ActorType.BF) {
    await requestQueue.addRequest({
      url: bfUrl,
      userData: {
        label: LABELS.MAIN_CATEGORY,
        mainCategory: "Black Friday"
      }
    });
  } else if (type === ActorType.TEST) {
    await requestQueue.addRequest({
      url: "https://www.mountfield.sk/pily-prislusenstvo-retaze",
      userData: {
        label: LABELS.CATEGORY,
        mainCategory: "TEST"
      }
    });
  }

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    maxConcurrency,
    maxRequestRetries,
    useSessionPool: true,
    proxyConfiguration,
    handlePageFunction: async context => {
      const { request } = context;
      const {
        url,
        userData: { label }
      } = request;
      log.info(`Scraping [${label}] - ${url}`);

      switch (label) {
        case LABELS.START:
          return scrapeCategoryItems(context);
        case LABELS.SUB_CATEGORY:
          return scrapeCategory(context, { userInput, s3 });
      }
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  if (!development) {
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `mountfield.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    await uploadToKeboola(getTableName(userInput));
  }
  log.info("Finished.");
});
