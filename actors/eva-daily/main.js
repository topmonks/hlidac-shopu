import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

const { log } = Apify.utils;

const HOST = "https://www.eva.cz";

const completeUrl = x => `${HOST}${x}`;

async function enqueueRequests(requestQueue, urls, userData) {
  for (const url of urls) {
    await requestQueue.addRequest(
      {
        url: url,
        userData: userData
      },
      { forefront: true }
    );
  }
}

async function handlePagination($, request, requestQueue) {
  const nextPagination = $("ul.pagination i.fa-angle-right");
  if (nextPagination.length > 0) {
    const nextFirst = request.userData.first + 36;
    const url = new URL(request.url);
    url.searchParams.set("first", nextFirst.toString());
    url.search = url.searchParams.toString();
    console.log(`${request.url} Found pagination page ${url.toString()}`);
    await requestQueue.addRequest(
      {
        url: url.toString(),
        userData: {
          label: "PAGE",
          first: nextFirst
        }
      },
      { forefront: true }
    );
  }
}

function parseItem($, category) {
  return el => {
    const $el = $(el);
    //Check if item is unpacked/used
    if ($el.find("div.sgnao2").length === 0) {
      const itemUrl = $el.find("div.pb-1 h2 a");
      return {
        itemId: itemUrl.attr("href").match(/\/([^zbozi\/]+)\//)?.[1],
        itemName: itemUrl.text(),
        itemUrl: new URL(itemUrl.attr("href"), HOST).href,
        img: "https:" + $el.find("img").attr("data-src"),
        currentPrice: $el.find("span.price").text().replace(/\s/g, "").trim(),
        originalPrice: null,
        discounted: category.includes("akční nabídka"),
        currency: "CZK",
        inStock: $el
          .find("div.st_onstore")
          .text()
          .toLowerCase()
          .includes("skladem")
          ? true
          : $el
              .find("div.st_onstore2")
              .text()
              .toLowerCase()
              .includes("skladem u dodavatele"),
        category
      };
    }
  };
}

async function handleItems($, request, processedIds, stats, s3) {
  const category = $("div#regularcontent h1").text();
  const products = $("#content_list div.zitembox")
    .get()
    .map(parseItem($, category))
    .filter(function (element) {
      //remove undefined due to unpacked/used items
      return element !== undefined;
    });

  // we don't need to block pushes, we will await them all at the end
  const requests = [];
  for (const product of products) {
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      requests.push(Apify.pushData(product), uploadToS3v2(s3, product));
      stats.items++;
    } else {
      stats.itemsDuplicity++;
    }
  }
  console.log(`${request.url} Found ${requests.length / 2} unique products`);
  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);
}

Apify.main(async () => {
  rollbar.init();
  let stats = {};
  const processedIds = new Set();
  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  // Get queue and enqueue first url.
  const requestQueue = await Apify.openRequestQueue();

  if (type === "FULL" || type === "COUNT") {
    await requestQueue.addRequest({
      url: "https://eva.cz",
      userData: {
        label: "START"
      }
    });
  } else if (type === "TEST") {
    await requestQueue.addRequest({
      url: `https://www.eva.cz/oddeleni/mraznicky-pultove/`,
      userData: {
        label: "CATEGORY",
        first: 0
      }
    });
  }

  log.info("ACTOR - setUp crawler");
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
    handlePageFunction: async ({ request, $ }) => {
      if (request.userData.label === "PAGE") {
        //Check if there is next pagination
        await handlePagination($, request, requestQueue);
        //Scrap products from page
        await handleItems($, request, processedIds, stats, s3);
        stats.pages++;
      } else if (request.userData.label === "CATEGORY") {
        try {
          // Add subcategories if this category has also products
          const subcategories = $("div#mele div.lmsubmenu div.mlevel")
            .last()
            .find("a")
            .map(function () {
              return completeUrl($(this).attr("href"));
            })
            .get();
          if (subcategories.length > 0) {
            stats.categories += subcategories.length;
            console.log(
              `${request.url} Found ${subcategories.length} subcategories`
            );
            await enqueueRequests(requestQueue, subcategories, {
              label: "CATEGORY",
              first: 0
            });
          }

          //Check if there is next pagination
          await handlePagination($, request, requestQueue);
          //Scrap products from page
          await handleItems($, request, processedIds, stats, s3);
        } catch (e) {
          console.log(`Error processing url ${request.url}`);
          console.error(e);
        }
      } else if (request.userData.label === "START") {
        const links = $("#mele > div.lmitem > a")
          .map(function () {
            return completeUrl($(this).attr("href"));
          })
          .get()
          .filter(
            x =>
              !x.includes("novinky") &&
              !x.includes("rozbalene") &&
              !x.includes("vyprodej")
          );
        //If type is COUNT, use category urls for count all products
        await enqueueRequests(requestQueue, links, {
          label: type === "COUNT" ? "COUNT" : "CATEGORY",
          first: 0
        });
        stats.categories += links.length;
        console.log(`${request.url} Found ${links.length} categories`);
      } else if (request.userData.label === "COUNT") {
        //Not unique items. Can include hidden items,unpacked, used, duplicity listing
        const countElement = $(
          "div#content_filter div.fpanel_inside div.float-right"
        );
        if (countElement.length > 0) {
          const countItems = parseInt(countElement.text(), 10);
          stats.items += countItems;
          console.log(`${request.url} Counted ${countItems} items`);
        }
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed multiple times`);
    }
  });

  // Run crawler.
  await crawler.run();

  console.log("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development && type !== "COUNT") {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "eva.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola("eva_cz");
    log.info("upload to Keboola finished");
  }
});
