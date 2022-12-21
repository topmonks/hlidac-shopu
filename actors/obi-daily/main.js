import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2,
  cleanPrice
} from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, KeyValueStore, log, LogLevel } from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { URL } from "url";
import { HttpCrawler } from "@crawlee/http";
import { parseHTML } from "linkedom";

/** @enum */
const Labels = {
  Start: "START",
  List: "LIST",
  Detail: "DETAIL",
  SubCat: "SUBCAT"
};

function startUrls({ document, homePageUrl }) {
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
  return categoryLinkList
    .filter(categoryObject => !categoryObject.dataWebtrekk)
    .map(categoryObject => new URL(categoryObject.href, homePageUrl).href);
}

function pagesUrls({ document, url }) {
  const productCount = Number(
    document.querySelector(".variants")?.getAttribute("data-productcount")
  );
  const productPerPageCount = document
    .querySelectorAll("li.product > a")
    .filter(a => a.getAttribute("data-ui-name")).length;
  const pageCount = Math.ceil(productCount / productPerPageCount);
  if (pageCount > 1) {
    return Array(pageCount - 1)
      .fill(0)
      .map((_, i) => i + 2)
      .map(i => `${url}/?page=${i}`);
  } else {
    return [];
  }
}

async function handleSubCategory(
  context,
  { document, homePageUrl, stats, processedIds }
) {
  const { enqueueLinks, request } = context;
  const variants = document.querySelector(".variants");
  const productCount = parseInt(
    variants?.getAttribute("data-productcount"),
    10
  );
  const label = request.userData.label;
  const { url } = request;

  if (productCount) {
    const pageUrls = pagesUrls({ document, url });
    await enqueueLinks({
      urls: pageUrls,
      userData: { label: Labels.List }
    });
    stats.add("urls", pageUrls.length);

    const urls = listUrls({ request, document, processedIds });
    stats.add("urls", urls.length);
    await enqueueLinks({
      urls,
      userData: { label: Labels.Detail }
    });
  } else {
    const subCategoryList = document
      .querySelectorAll('a[wt_name="assortment_menu.level2"]')
      .map(a => a.getAttribute("href"));
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

function listUrls({ request, document, processedIds }) {
  return document
    .querySelectorAll("li.product > a")
    .filter(a => a.getAttribute("data-ui-name"))
    .map(a => a.getAttribute("href"))
    .filter(url => !processedIds.has(url))
    .map(url => {
      processedIds.add(url);
      return new URL(url, request.url).href;
    });
}

function extractProduct({ url, document }) {
  const itemId = document
    .querySelector('input[name="code"]')
    .getAttribute("value")
    .trim();
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
    originalPrice = cleanPrice(discountedPrice);
  }
  let img = document.querySelector(".ads-slider__link").getAttribute("href");
  if (!img) {
    img = document.querySelector(".ads-slider__image").getAttribute("data-src");
  }
  const result = {
    itemUrl: url,
    itemName: document
      .querySelector(".overview__description >.overview__heading")
      .innerText.trim(),
    itemId,
    currency,
    currentPrice: cleanPrice(
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
  return result;
}

function getItemIdFromUrl(url) {
  return url.match(/p\/(\d+)(#\/)?$/)?.[1];
}

function variantsUrls({ url, document, processedIds }) {
  const crawledItemId = getItemIdFromUrl(url);
  return document
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
      if (crawledItemId === itemId || processedIds.has(itemId)) {
        return;
      }
      processedIds.add(itemId);
      return productUrl;
    })
    .filter(Boolean);
}

async function enqueueVariants(
  { enqueueLinks, request },
  { document, processedIds, stats }
) {
  const productLinkList = variantsUrls({
    url: request.url,
    document,
    processedIds
  });
  stats.add("urls", productLinkList.length);
  await enqueueLinks({
    urls: productLinkList,
    userData: { label: Labels.Detail }
  });
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
  let stats = await withPersistedStats(x => x, {
    urls: 0,
    items: 0,
    totalItems: 0
  });

  const input = (await KeyValueStore.getInput()) ?? {};

  const {
    development = process.env.TEST || process.env.DEBUG,
    proxyGroups = ["CZECH_LUMINATI"],
    maxRequestRetries = 3,
    maxConcurrency = 10
  } = input;
  const country = input?.country?.toLowerCase() ?? "cz";

  if (development) {
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
    maxRequestsPerMinute: 600,
    requestHandlerTimeoutSecs: 45,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    sessionPoolOptions: {
      maxPoolSize: 150
    },
    async requestHandler(context) {
      const { request, body, enqueueLinks } = context;
      log.info(`Processing ${request.url}`);
      const { document } = parseHTML(body.toString());
      const { label } = context.request.userData;
      if (label === Labels.Start) {
        const urls = startUrls({
          document,
          homePageUrl
        });
        stats.add("urls", urls.length);
        await enqueueLinks({
          urls,
          userData: { label: Labels.SubCat }
        });
      } else if (label === Labels.SubCat) {
        await handleSubCategory(context, {
          document,
          homePageUrl,
          stats,
          processedIds
        });
      } else if (label === Labels.List) {
        const urls = listUrls({ request, document, processedIds });
        stats.add("urls", urls.length);
        await enqueueLinks({
          urls,
          userData: { label: Labels.Detail }
        });
      } else if (label === Labels.Detail) {
        stats.inc("totalItems");
        await enqueueVariants(context, {
          document,
          processedIds,
          stats
        });
        const product = extractProduct({
          url: request.url,
          document
        });
        if (product) {
          stats.inc("items");
          await Promise.all([
            Dataset.pushData(product),
            uploadToS3v2(s3, product)
          ]);
        }
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
      userData: { label: Labels.Start }
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
