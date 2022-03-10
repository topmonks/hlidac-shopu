import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import { fetchPage, fetchDetail, countProducts } from "./src/crawler.js";
import cheerio from "cheerio";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

const { log } = Apify.utils;

Apify.main(async () => {
  rollbar.init();
  let stats = {};
  const processedIds = new Set();
  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL",
    startUrls = [
      "https://www.electroworld.cz/smart-inteligentni-domacnost",
      "https://www.electroworld.cz/televize-foto-audio-video",
      "https://www.electroworld.cz/mobily-notebooky-tablety-pc-gaming",
      "https://www.electroworld.cz/velke-spotrebice-chladnicky-pracky",
      "https://www.electroworld.cz/male-spotrebice-vysavace-kavovary",
      "https://www.electroworld.cz/zahrada-dum-sport-hobby"
    ],
    detailURLs = [
      "https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy",
      "https://www.electroworld.cz/nine-eagles-galaxy-visitor-3",
      "https://www.electroworld.cz/samsung-galaxy-a52-128-gb-cerna"
    ],
    bfUrls = ["https://www.electroworld.cz/blackfriday-2021/sort-by_cheapest"]
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });
  const dataset = await Apify.openDataset();
  const requestQueue = await Apify.openRequestQueue();
  const crawlContext = {
    requestQueue: requestQueue,
    dataset: dataset,
    stats,
    processedIds,
    s3,
    type
  };

  if (type === "FULL") {
    for (let i = 0; i < startUrls.length; i++) {
      await requestQueue.addRequest({ url: startUrls[i] });
    }
  } else if (type === "DETAIL") {
    for (let i = 0; i < detailURLs.length; i++) {
      await requestQueue.addRequest({ url: detailURLs[i] });
    }
  } else if (type === "COUNT") {
    await countProducts(stats);
  } else if (type === "TEST_FULL") {
    await requestQueue.addRequest({
      userData: { label: "nthPage", pageN: 0 },
      url: "https://www.electroworld.cz/smart-televize?p5%5B43814%5D=hisense"
    });
  } else if (type === "BF") {
    for (let i = 0; i < bfUrls.length; i++) {
      await requestQueue.addRequest({ url: bfUrls[i] });
    }
  }

  let crawler;
  if (type === "BF") {
    crawler = new Apify.PlaywrightCrawler({
      requestQueue,
      proxyConfiguration,
      maxConcurrency,
      maxRequestRetries,
      navigationTimeoutSecs: 120,
      launchContext: {
        useChrome: true,
        launchOptions: {
          headless: true
        }
      },
      handlePageFunction: async context => {
        const { request, page } = context;
        await page.waitForSelector(".product-box__price-bundle");
        await page.waitForSelector("ul.pagination");
        const text = await page.content();
        const $ = cheerio.load(text);
        await fetchPage({ request, $ }, crawlContext);
      },
      handleFailedRequestFunction: async ({ request }) => {
        stats.failed++;
        log.error(`Request ${request.url} failed multiple times`, request);
      }
    });
  } else {
    crawler = new Apify.CheerioCrawler({
      requestQueue: requestQueue,
      proxyConfiguration: proxyConfiguration,
      maxRequestRetries,
      maxConcurrency,
      handlePageFunction: async context => {
        if (type === "FULL" || type === "TEST_FULL") {
          await fetchPage(context, crawlContext);
        } else if (type === "DETAIL") {
          await fetchDetail(context.$, context.request, dataset);
        }
      }
    });
  }

  log.info("Starting the crawl.");

  await crawler.run();

  console.log("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  log.info(
    `Found ${crawlContext.stats.categories} subcategory pages and ${crawlContext.stats.pages} ` +
      `product list pages in total; scraped ${crawlContext.stats.items} products.`
  );

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "electroworld.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola(
      type === "BF" ? "electroworld_cz_bf" : "electroworld_cz"
    );
    log.info("upload to Keboola finished");
  }
});
