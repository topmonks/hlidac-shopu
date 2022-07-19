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
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};
const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY"
};

const rootUrlByCountry = new Map([
  [COUNTRY.CZ, "https://www.mountfield.cz/predvypis"],
  [COUNTRY.SK, "https://www.mountfield.sk/predvypis"]
]);

const { log } = Apify.utils;

function parsePrice(text) {
  return parseFloat(
    text
      .replace(/\s/g, "")
      .replace("Kč", "")
      .replace("€", "")
      .replace(",", ".")
      .trim()
  );
}

async function extractItems({ $, $products, s3, userInput }) {
  const { country = COUNTRY.CZ } = userInput;
  const category = [];
  $(".box-breadcrumb__item").each(function () {
    category.push($(this).text().trim());
  });
  const requests = [];
  log.debug(`*********** FOUND ${$products.length} items *****************`);
  for (const product of $products.toArray()) {
    const result = {};
    const $item = $(product);
    const itemUrl = $item.find(" > a").attr("href");
    const splitUrl = itemUrl.split("-");
    const itemCode = splitUrl[splitUrl.length - 1];
    const name = $item.find("h2").text()?.trim();

    const $actionPriceSpan = $item.find(
      ".list-products__item__info__price__item--main"
    );
    $actionPriceSpan.find("span").remove();
    const actionPrice = $actionPriceSpan.text();
    const $retailPriceSpan = $item.find(
      ".list-products__item__info__price__item--old"
    );
    $retailPriceSpan.find("span").remove();
    const retailPrice = $retailPriceSpan.text();

    result.currentPrice = parsePrice(actionPrice);
    result.originalPrice = parsePrice(retailPrice);

    result.discounted = false;
    if (
      (result.originalPrice !== -1 || result.originalPrice !== null) &&
      result.originalPrice > result.currentPrice
    ) {
      result.discounted = true;
    }

    result.id = itemCode;
    result.itemUrl = itemUrl;
    result.itemId = itemCode;
    result.itemName = name;
    result.category = category.join(" > ");
    result.currency = country === COUNTRY.CZ ? "CZK" : "EUR";
    if ($item.find("img").length !== 0) {
      result.img = $item.find("img").data("src");
    }
    requests.push(
      Apify.pushData(result),
      !userInput.development
        ? uploadToS3v2(s3, result, {
            priceCurrency: result.currency,
            inStock: true
          })
        : null
    );
    stats.inc("items");
  }
  await Promise.all(requests);
}

async function scrapeProducts({ $, s3, userInput }) {
  const $products = $(".list-products__item__in");
  if (!$products.length) return;

  await extractItems({ $, $products, s3, userInput });
}

/**
 * return name of the table in keboola according the language
 * @return {string|string}
 */
export const getTableName = userInput => {
  const { type, country = COUNTRY.CZ } = userInput;
  let tableName = `mountfield_${country.toLowerCase()}`;
  if (type === ActorType.BF) {
    tableName = `${tableName}_bf`;
  }
  return tableName;
};

async function scrapeCategoryItems({ $, crawler }, { stats }) {
  const categoryItems = $(".list-categories__item__block").toArray();
  for (const cat of categoryItems) {
    const url = $(cat).attr("href");
    stats.inc("categories");
    await crawler.requestQueue.addRequest({
      url,
      userData: {
        label: LABELS.CATEGORY,
        mainCategory: $(cat).find("h3").text()?.trim()
      }
    });
  }
}

async function scrapeCategory(
  { $, request, crawler },
  { userInput, s3, stats }
) {
  const { mainCategory } = request.userData;
  const categories = $(
    `.list-categories__item__block,
     .list-categories-with-article__box`
  ).toArray();
  if (categories.length) {
    for (const cat of categories) {
      const url = $(cat).attr("href");
      stats.inc("categories");
      await crawler.requestQueue.addRequest({
        url,
        userData: {
          label: LABELS.CATEGORY,
          mainCategory
        }
      });
    }
    log.debug(`Found categories ${categories.length}`);
  } else {
    await scrapeProducts({ $, s3, userInput, stats });
    const href = $("a.in-paging__control__item--arrow-next").attr("href");
    if (!href) return;

    const paginationUrl = new URL(href, request.url).href;
    await crawler.requestQueue.addRequest({
      url: paginationUrl,
      userData: {
        label: LABELS.CATEGORY,
        mainCategory
      }
    });
    log.debug(`Found pagination page ${paginationUrl}`);
  }
}

Apify.main(async function main() {
  rollbar.init();

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0
  });

  const userInput = await Apify.getInput();
  const {
    development = false,
    debug = false,
    country = COUNTRY.CZ,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.FULL,
    bfUrl = "https://www.mountfield.cz/black-friday"
  } = userInput ?? {};

  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  const requestQueue = await Apify.openRequestQueue();
  const rootUrl = rootUrlByCountry.get(country);
  if (type === ActorType.FULL) {
    await requestQueue.addRequest({
      url: rootUrl,
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
    async handlePageFunction(context) {
      const { request } = context;
      const {
        url,
        userData: { label }
      } = request;
      log.debug(`Scraping [${label}] - ${url}`);

      switch (label) {
        case LABELS.START:
          return scrapeCategoryItems(context, { stats });
        case LABELS.CATEGORY:
          return scrapeCategory(context, { userInput, s3, stats });
      }
    },
    // If request failed 4 times then this function is executed
    async handleFailedRequestFunction({ request }) {
      log.error(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await stats.save();

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopName(rootUrl));
    log.info("invalidated Data CDN");

    const tableName = getTableName(userInput);
    await uploadToKeboola(tableName);
  }
  log.info("Finished.");
});
