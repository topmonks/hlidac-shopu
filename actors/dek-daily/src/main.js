import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import { LABELS, COUNTRY } from "./const.js";
import {
  getTableName,
  getRootUrl,
  enqueueCategories,
  parsePrice
} from "./tools.js";

const { log } = Apify.utils;

async function scrapeScriptTags({ $, crawler }, { userInput }) {
  for (const script of $("script")) {
    if ($(script).html().includes("JSON.parse")) {
      const start =
        $(script).html().indexOf('JSON.parse("') + 'JSON.parse("'.length;
      const end = $(script).html().indexOf('"));');
      const rawJson = $(script)
        .html()
        .substring(start, end)
        .trim()
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "");
      const json = JSON.parse(rawJson);
      const cats = enqueueCategories(Object.values(json));
      for (const cat of cats) {
        await crawler.requestQueue.addRequest({
          url: `${getRootUrl(userInput)}${cat}`,
          userData: {
            label: LABELS.CATEGORY,
            page: 1
          }
        });
      }
    }
  }
}

async function scrapeCategory({ $, request, crawler }, { s3, userInput }) {
  const { country = COUNTRY.CZ } = userInput;
  const { page } = request.userData;
  const subCategories = $(".comd-menu-menu-image__link").toArray();
  if (subCategories.length > 0) {
    for (const sc of subCategories) {
      await crawler.requestQueue.addRequest({
        url: `${getRootUrl(userInput)}${$(sc).attr("href")}`,
        userData: {
          label: LABELS.CATEGORY,
          page: 1
        }
      });
    }
    return;
  }
  if (page === 1) {
    const pages = $(".com-pagination > a:not(.active)").toArray();
    if (pages.length > 0) {
      const lastPage = $(pages[pages.length - 1])
        .text()
        .trim();
      for (let i = 2; i <= parseInt(lastPage, 10); i++) {
        await crawler.requestQueue.addRequest(
          {
            url: `${request.url}?page=${i}`,
            userData: {
              label: LABELS.CATEGORY,
              page: i
            }
          },
          { forefront: true }
        );
      }
    }
  }
  const requests = [];
  const category = $(".comd-menu-breadcrumbs > a > span")
    .toArray()
    .map(c => {
      return $(c).text().trim();
    });
  for (const product of $(".com-product-preview")) {
    const url = $(product)
      .find(".com-product-preview__image-main")
      .attr("href");
    const title = $(product).find(".com-product-preview__title").text().trim();
    const currentPriceRaw = $(product)
      .find(".com-price-product-eshop__price-vat--highlight")
      .text()
      .trim();
    const currentPrice = parsePrice(currentPriceRaw);
    const originalPriceRaw = $(product)
      .find(".com-price-product-eshop > strike")
      ?.text()
      ?.trim();
    const originalPrice = parsePrice(originalPriceRaw);
    const img = $(product).find("picture > img").attr("src");
    const inStock = $(product).find(
      ".com-add-to-cart-eshop__availability--green"
    );

    const result = {
      itemId: url.match(/\/(\d+)-/)?.[1],
      itemUrl: `${getRootUrl(userInput)}${url}`,
      itemName: title,
      category: category.join(" > "),
      currency: country === COUNTRY.CZ ? "CZK" : "EUR",
      currentPrice,
      originalPrice,
      discounted: !!originalPrice,
      img,
      inStock: !!(inStock && inStock.length > 0)
    };
    requests.push(
      Apify.pushData(result),
      !userInput.development
        ? uploadToS3v2(s3, result, { priceCurrency: result.currency })
        : null
    );
  }
  await Promise.allSettled(requests);
}

Apify.main(async () => {
  rollbar.init();
  const userInput = await Apify.getInput();
  const {
    development = false,
    debugLog = false,
    country = COUNTRY.CZ,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL
  } = userInput ?? {};
  const requestQueue = await Apify.openRequestQueue();
  if (type === ActorType.FULL) {
    await requestQueue.addRequest({
      url: getRootUrl(userInput),
      userData: {
        label: LABELS.START
      }
    });
  } else if (type === ActorType.TEST) {
    await requestQueue.addRequest({
      url: "https://www.dek.cz/produkty/vypis/13321-kamna-a-krby",
      userData: {
        label: LABELS.CATEGORY
      }
    });
  }

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
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
          return scrapeScriptTags(context, { userInput });
        case LABELS.CATEGORY:
          return scrapeCategory(context, { s3, userInput });
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
      `dek.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");

    await uploadToKeboola(getTableName(userInput));
  }
  log.info("Finished.");
});
