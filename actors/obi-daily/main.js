import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, KeyValueStore, log, LogLevel } from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { URL } from "url";
import { HttpCrawler } from "@crawlee/http";
import { parseHTML } from "linkedom";

async function handleStart(
  { enqueueLinks, request },
  { document, homePageUrl, inputData, stats }
) {
  let categoryLinkList = document
    .querySelectorAll(
      ".headr__nav-cat-col-inner > .headr__nav-cat-row > a.headr__nav-cat-link"
    )
    .map(a => ({
      href: a.getAttribute("href"),
      dataWebtrekk: a.getAttribute("data-webtrekk")
    }));
  if (!categoryLinkList.length) {
    categoryLinkList = document
      .querySelectorAll("ul.first-level > li > a")
      .map(a => ({
        href: a.getAttribute("href")
      }));
  }
  log.debug(`[handleStart] label: ${request.userData.label}`, {
    url: request.url,
    categoryLinkList
  });
  if (inputData.development) {
    categoryLinkList = categoryLinkList.slice(0, 1);
    log.debug(`development mode, subcategory is`, { categoryLinkList });
  }

  const urls = categoryLinkList
    .filter(categoryObject => !categoryObject.dataWebtrekk)
    .map(categoryObject => new URL(categoryObject.href, homePageUrl).href);
  stats.add("urls", urls.length);
  await enqueueLinks({
    urls,
    userData: { label: "SUBCAT" }
  });
}

async function handleSubCategory(
  context,
  { document, homePageUrl, inputData, stats }
) {
  const { enqueueLinks, request } = context;
  const variants = document.querySelector(".variants");
  const productCount = parseInt(
    variants?.getAttribute("data-productcount"),
    10
  );
  const label = request.userData.label;
  log.debug(`[handleSubCategory] label: ${label}`, {
    url: request.url,
    productCount
  });

  if (productCount) {
    await handleLastSubCategory(context, { document, inputData, stats });
  } else {
    let subCategoryList = document
      .querySelectorAll('a[wt_name="assortment_menu.level2"]')
      .map(a => a.getAttribute("href"));
    log.debug(`${label}`, { subCategoryList });
    if (inputData.development) {
      subCategoryList = subCategoryList.slice(0, 1);
      log.debug(`development mode, ${label} is`, subCategoryList);
    }

    const urls = subCategoryList.map(
      subcategoryLink => new URL(subcategoryLink, homePageUrl).href
    );
    stats.add("urls", urls.length);
    await enqueueLinks({
      urls,
      userData: { label }
    });
  }
}

async function handleLastSubCategory(context, { document, inputData, stats }) {
  const { enqueueLinks, request } = context;
  const productCount = Number(
    document.querySelector(".variants")?.getAttribute("data-productcount")
  );
  log.debug(`[handleLastSubCategory] label: ${request.userData.label}`, {
    url: request.url,
    productCount
  });
  const productPerPageCount = document
    .querySelectorAll("li.product > a")
    .filter(a => a.getAttribute("data-ui-name")).length;
  let pageCount = Math.ceil(productCount / productPerPageCount);
  if (inputData.development) {
    pageCount = 1;
  }
  if (pageCount > 1) {
    const urls = Array(pageCount - 1)
      .fill(0)
      .map((_, i) => i + 2)
      .map(i => `${request.url}/?page=${i}`);
    await enqueueLinks({
      urls,
      userData: { label: "LIST" }
    });
    stats.add("urls", urls.length);
  }
  await handleList(context, { document, stats });
}

async function handleList({ enqueueLinks, request }, { document, stats }) {
  let productLinkList = document
    .querySelectorAll("li.product > a")
    .filter(a => a.getAttribute("data-ui-name"))
    .map(a => a.getAttribute("href"));
  log.debug(`[handleList] label: ${request.userData.label}`, {
    url: request.url,
    productLinkList
  });
  const urls = productLinkList.map(url => new URL(url, request.url).href);
  await enqueueLinks({
    urls,
    userData: { label: "DETAIL" }
  });
  stats.add("urls", urls.length);
}

async function handleDetail(
  context,
  { document, s3, processedIds, pushList, variantIds, stats }
) {
  const { request } = context;
  const itemId = document
    .querySelector('input[name="code"]')
    .getAttribute("value")
    .trim();
  if (!processedIds.has(itemId)) {
    let currency = document
      .querySelector('meta[itemprop="priceCurrency"]')
      ?.getAttribute("content");
    if (!currency) return;
    if (currency === "SKK") {
      currency = "EUR";
    }
    let discountedPrice = document.querySelector(".saving + del")?.innerText;
    let originalPrice = null;
    if (discountedPrice) {
      originalPrice = parsePrice(discountedPrice);
    }
    let img = document.querySelector(".ads-slider__link").getAttribute("href");
    if (!img) {
      img = document
        .querySelector(".ads-slider__image")
        .getAttribute("data-src");
    }
    const result = {
      itemUrl: request.url,
      itemName: document
        .querySelector(".overview__description >.overview__heading")
        .innerText.trim(),
      itemId,
      currency,
      currentPrice: parsePrice(
        document.querySelector('[data-ui-name="ads.price.strong"]').innerText
      ),
      discounted: Boolean(discountedPrice),
      originalPrice,
      inStock: Boolean(
        document.querySelector("div.marg_b5").innerText.match(/(\d+)/)
      ),
      img: `https:${img}`,
      category: document
        .querySelectorAll('a[class*="normal"][wt_name*="breadcrumb.level"]')
        .map(a => a.innerText)
        .join("/")
    };
    pushList.push(Dataset.pushData(result), uploadToS3v2(s3, result));
    processedIds.add(result.itemId);
    stats.inc("items");
  } else {
    stats.inc("itemsDuplicity");
  }
  stats.inc("totalItems");
  if (pushList.length > 70) {
    await Promise.all(pushList);
    pushList = [];
  }

  await handleVariant(context, { document, variantIds, processedIds, stats });
}

function getItemIdFromUrl(url) {
  return url.match(/p\/(\d+)(#\/)?$/)?.[1];
}

async function handleVariant(
  { enqueueLinks, request },
  { document, variantIds, processedIds, stats }
) {
  let crawledItemId = getItemIdFromUrl(request.url);
  let productLinkList = document
    .querySelectorAll(
      `.selectboxes .selectbox li:not([class*="disabled"]) a[wt_name*="size_variant"],
    .selectboxes .selectbox li[data-ui-name="ads.variants.color.enabled"] a[wt_name*="color_variant"]`
    )
    .map(a => {
      let productUrl = a.getAttribute("href");
      if (!productUrl) {
        return;
      }
      let itemId = getItemIdFromUrl(productUrl);
      if (
        crawledItemId === itemId ||
        variantIds.has(itemId) ||
        processedIds.has(itemId)
      ) {
        return;
      }
      variantIds.add(itemId);
      return productUrl;
    })
    .filter(Boolean);

  if (!productLinkList.length) return;

  log.debug(`[handleVariant] label: ${request.userData.label}`, {
    url: request.url,
    productLinkList
  });

  await enqueueLinks({
    urls: productLinkList,
    userData: { label: "DETAIL" }
  });
  stats.add("urls", productLinkList.length);
}

function parsePrice(text) {
  const price = text
    .trim()
    .replace(/\s|'/g, "")
    .replace(/,/, ".")
    .match(/(\d+(.\d+)?)/)?.[0];
  return price ? parseFloat(price) : null;
}

async function main() {
  log.info("Actor starts.");

  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const processedIds = new Set();
  const variantIds = new Set();
  let stats = await withPersistedStats(x => x, {
    urls: 0,
    items: 0,
    itemsDuplicity: 0,
    totalItems: 0
  });
  let pushList = [];

  const input = (await KeyValueStore.getInput()) ?? {};

  const {
    development = false,
    debug = false,
    proxyGroups = ["CZECH_LUMINATI"],
    maxRequestRetries = 3,
    maxConcurrency = 10
  } = input;
  const country = input?.country?.toLowerCase() ?? "cz";
  const inputData = { country, development, debug };

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  let homePageUrl = `https://www.obi${
    country === "it" ? "-italia" : ""
  }.${country}`;

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    requestHandlerTimeoutSecs: 60,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    sessionPoolOptions: {
      maxPoolSize: 150
    },
    async requestHandler(context) {
      const { request, body } = context;
      log.info(`Processing ${request.url}`);
      const { document } = parseHTML(body.toString());
      const { label } = context.request.userData;
      if (label === "START") {
        await handleStart(context, { document, homePageUrl, inputData, stats });
      } else if (label === "SUBCAT") {
        await handleSubCategory(context, {
          document,
          homePageUrl,
          inputData,
          stats
        });
      } else if (label === "LIST") {
        await handleList(context, { document, stats });
      } else if (label === "DETAIL") {
        await handleDetail(context, {
          document,
          s3,
          processedIds,
          pushList,
          variantIds,
          stats
        });
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  log.info("crawler starts.");
  await crawler.run([
    {
      url: homePageUrl,
      userData: { label: "START" }
    }
  ]);
  log.info("crawler finished");

  await stats.save();

  const directoryName = `obi${country === "it" ? "-italia" : ""}.${country}`;
  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", directoryName);
  log.info(`invalidated Data CDN ${directoryName}`);

  if (!development) {
    const tableName = `obi${country === "it" ? "-italia" : ""}_${country}`;
    await uploadToKeboola(tableName);
    log.info(`update to Keboola finished ${tableName}.`);
  }
  log.info("Actor Finished.");
}

await Actor.main(main);
