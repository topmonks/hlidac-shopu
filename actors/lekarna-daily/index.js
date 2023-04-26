import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { Actor, Dataset, log } from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { CheerioCrawler } from "@crawlee/cheerio";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";

export const web = "https://www.lekarna.cz";
const processedIds = new Set();

async function extractItems($, $products, breadCrumbs, stats) {
  const itemsArray = [];
  $products.each(async function() {
    const result = {};
    const $item = $(this);
    const itemUrl = $item.find("meta[itemprop=url]").attr("content");
    const name = $item.find("h2").text().trim();
    const cartBut = $item.find("input[name=\"productSkuId\"]");
    let id;
    if (cartBut.length !== 0) {
      id = cartBut.attr("value");
    } else if ($item.find("a[data-gtm]").length !== 0) {
      const itemJsonObject = JSON.parse(
        $item.find("a[data-gtm]").attr("data-gtm")
      );
      const products =
        itemJsonObject.ecommerce.click &&
        itemJsonObject.ecommerce.click.products
          ? itemJsonObject.ecommerce.click.products
          : [];
      const filtredProducts = products.filter(item =>
        item.variant.indexOf("Dlouhodobě nedostupný")
      );
      id = filtredProducts.length !== 0 ? filtredProducts[0].id : null;
    }

    const $actualPriceSpan = $item.find("span[itemprop=price]");
    const $oldPriceSpan = $item.find("span.text-gray-500.line-through");

    if ($actualPriceSpan.length > 0) {
      const itemImgUrl = $item.find("picture source").last().attr("srcset");
      result.itemId = id;
      result.itemName = name;
      result.itemUrl = itemUrl.includes("https") ? itemUrl : `${web}${itemUrl}`;
      result.img = itemImgUrl;
      result.category = breadCrumbs;
      result.currentPrice = parseFloat($actualPriceSpan.attr("content"));
      result.currency = $item
        .find("span[itemprop=priceCurrency]")
        .attr("content");
      if ($oldPriceSpan.length > 0) {
        result.originalPrice = parseFloat(
          $oldPriceSpan.text().replace("Kč", "").replace(/\s/g, "").trim()
        );
        result.discounted = true;
      } else {
        result.originalPrice = null;
        result.discounted = false;
      }
      itemsArray.push(result);
    } else {
      //Skipped itemprop="itemListElement" that's not product
      stats.inc("itemsSkipped");
    }
  });
  return itemsArray;
}

async function extractBfItems($, $products, breadCrumbs, stats) {
  const itemsArray = [];
  $products.each(async function() {
    const result = {};
    const $item = $(this);
    const itemHeader = $item.find("h2 a");
    const itemOriginalPrice = $item.find("p.items-center span.line-through");
    const originalPrice = itemOriginalPrice
      ? parseFloat(
        itemOriginalPrice.text().replace("Kč", "").replace(/\s/g, "").trim()
      )
      : null;
    const itemJsonObject = JSON.parse(itemHeader.attr("data-datalayer"));
    const itemJson = itemJsonObject.ecommerce.products[0];
    const currentPrice = parseFloat(itemJson.price);
    const itemUrl = itemHeader.attr("href");

    const itemImgUrl = $item.find("picture img").attr("src");

    if (parseFloat(itemJson.price) > 0) {
      result.itemId = itemJson.id;
      result.itemName = itemJson.name;
      result.itemUrl = `https://lekarna.cz/${itemUrl}`;
      result.img = itemImgUrl;
      result.category = itemJson.categories;
      result.currentPrice = currentPrice;
      result.originalPrice = originalPrice;
      result.discounted = originalPrice > currentPrice;
      result.currency = "CZK";
      result.inStock = itemJson.availability === "InStock";
      itemsArray.push(result);
    } else {
      log.info(`Skipp non price product [${itemJson.name}]`);
      stats.inc("itemsSkipped");
    }
  });
  return itemsArray;
}

export async function handleStart($, requestQueue, stats, log) {
  const getCategories = $("nav.items-center > ul > li > span > a");
  for (const cat of getCategories) {
    const url = $(cat).attr("href");
    console.log(url);
    await requestQueue.addRequest({
      url,
      userData: {
        label: "PAGE"
      }
    });
    stats.inc("pages");
  }
  log.info(`Enqueued ${getCategories.length} categories`);
}

export async function handleSubCategory($, requestQueue, request, stats, log) {
  const getSubcategories = $("#snippet--subcategories a");
  let subCatCount = 0;
  for (const subCat of getSubcategories) {
    const url = $(subCat).attr("href");
    if (!url.includes("?")) {
      subCatCount++;
      await requestQueue.addRequest(
        {
          url: url.includes("https") ? url : `${web}${url}`,
          userData: {
            label: "PAGE"
          }
        },
        { forefront: true }
      );
      stats.inc("pages");
    }
  }
  log.info(`Enqueued ${subCatCount} subcategories`);
}

export async function handlePagination($, requestQueue, request, type, stats, log) {
  let maxPage = 0;
  const snippetListing =
    type === ActorType.Full
      ? $("#snippet--productListing")
      : $("#snippet--itemListing");
  snippetListing.find("ul.flex.flex-wrap.items-stretch li").each(function() {
    //Try parse Number value from paginator
    const liValue = Number($(this).text().trim());
    //Save highest page value
    if (liValue > maxPage) {
      maxPage = liValue;
    }
  });
  //Handle pagination pages
  if (maxPage > 0) {
    for (let i = 2; i <= maxPage; i++) {
      await requestQueue.addRequest(
        {
          url: `${request.url}?strana=${i}`,
          userData: {
            label: "PAGI_PAGE",
            category: request.userData.category
          }
        },
        { forefront: true }
      );
      stats.inc("pages");
    }
    log.info(`Found ${maxPage - 1} pagination pages.`);
  }
}

export async function handleProducts($, requestQueue, request, type, stats, log) {
  const itemListElements =
    type === ActorType.Full
      ? $("[itemprop=\"itemListElement\"]")
      : $(
        "#snippet--itemListing div.flex.flex-col.flex-wrap.items-stretch.w-full"
      );
  if (itemListElements.length > 0) {
    let breadCrumbs = [];
    try {
      $(
        "ul[itemtype='https://schema.org/BreadcrumbList'] [itemprop='name']"
      ).each(function() {
        const attrContent = $(this).attr("content")?.trim();
        if (
          attrContent &&
          attrContent !== "" &&
          attrContent !== "Úvodní strana"
        ) {
          breadCrumbs.push(attrContent);
        }

        const text = $(this).text()?.trim();
        if (text && text !== "") {
          breadCrumbs.push(text);
        }
      });
      if (breadCrumbs.length > 0) {
        breadCrumbs = breadCrumbs.join(" > ");
      } else {
        breadCrumbs = "";
      }

      const products =
        type === ActorType.Full
          ? await extractItems($, itemListElements, breadCrumbs, stats)
          : await extractBfItems($, itemListElements, breadCrumbs, stats);
      // we don't need to block pushes, we will await them all at the end
      const requests = [];
      for (const product of products) {
        // Save data to dataset
        if (!processedIds.has(product.itemId)) {
          processedIds.add(product.itemId);
          requests.push(Dataset.pushData(product));
        } else {
          stats.inc("itemsDuplicity");
        }
      }
      stats.add("items", requests.length / 2);
      log.info(`Found ${requests.length / 2} unique products`);
      // await all requests, so we don't end before they end
      await Promise.all(requests);
    } catch (e) {
      log.error(e.message);
      log.error(`Failed extraction of items. ${request.url}`);
    }
  }
}

/**
 * @param {string} url
 * @param {ActorType} type
 */
export function getInitialUrls(url, type) {
  if (type === ActorType.BlackFriday) {
    const bfUrl = "https://www.lekarna.cz/blackfriday/";
    return [
      {
        url: bfUrl,
        label: "PAGE",
        userData: {
          category: bfUrl
        }
      }
    ];
  } else if (type === ActorType.Test) {
    return [
      {
        url: "https://www.lekarna.cz/masazni-pripravky/",
        label: "SUB_CATEGORY"
      }
    ];
  } else {
    return [{ url, label: "START" }];
  }
}

export async function main() {
  rollbar.init();

  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full
  } = await getInput();

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  if (development || debug) {
    log.setLevel(log.LEVELS.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new CheerioCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    async requestHandler({ $, request, crawler, log }) {
      if (request.userData.label === "SUB_CATEGORY") {
        log.info(`START with sub category ${request.url}`);
        await handleSubCategory($, crawler.requestQueue, request, stats, log);
      } else if (request.userData.label === "PAGE") {
        log.info(`START with page ${request.url}`);
        await handleSubCategory($, crawler.requestQueue, request, stats, log);
        await handlePagination(
          $,
          crawler.requestQueue,
          request,
          type,
          stats,
          log
        );
        await handleProducts(
          $,
          crawler.requestQueue,
          request,
          type,
          stats,
          log
        );
      } else if (request.userData.label === "PAGI_PAGE") {
        log.info(`START with page ${request.url}`);
        await handleProducts(
          $,
          crawler.requestQueue,
          request,
          type,
          stats,
          log
        );
      } else if (request.userData.label === "START") {
        await handleStart($, crawler.requestQueue, stats, log);
      }
    },
    async failedRequestHandler({ request, log }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  await crawler.run(getInitialUrls(web, type));
  await stats.save(true);

  const tableName =
    type === ActorType.BlackFriday ? "lekarna_bf" : "lekarna_cz";
  await uploadToKeboola(tableName);
}
