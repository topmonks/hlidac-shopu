const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const {
  invalidateCDN,
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const Apify = require("apify");
const { log, requestAsBrowser } = Apify.utils;
let stats = {};
const processedIds = new Set();
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
        currentPrice: $el.find("span.price").text(),
        originalPrice: null,
        currency: "CZK",
        inStock: $el
          .find("div.st_onstore")
          .text()
          .toLowerCase()
          .includes("skladem"),
        category
      };
    }
  };
}

async function handleItems($, request) {
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
      requests.push(
        Apify.pushData(product),
        uploadToS3(
          s3,
          "eva.cz",
          await s3FileName(product),
          "jsonld",
          toProduct(product, {})
        )
      );
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

  if (type === "COUNT") {
    //For now no way how count products differently
  } else if (type === "FULL") {
    await requestQueue.addRequest({
      url: "https://eva.cz",
      userData: {
        label: "START"
      }
    });
  } else if (type === "TEST") {
    await requestQueue.addRequest({
      url: `https://www.eva.cz/oddeleni/bila-technika/`,
      userData: {
        label: "CATEGORY"
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
    // Activates the Session pool.
    useSessionPool: true,
    // Overrides default Session pool configuration.
    sessionPoolOptions: {
      maxPoolSize: 200
    },
    handlePageFunction: async ({ request, $, session, response }) => {
      if (response.statusCode !== 200) {
        session.retire();
      }
      if (request.userData.label === "PAGE") {
        //Check if there is next pagination
        await handlePagination($, request, requestQueue);
        //Scrap products from page
        await handleItems($, request);
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
          await handleItems($, request);
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
              !x.includes("akce") &&
              !x.includes("novinky") &&
              !x.includes("rozbalene") &&
              !x.includes("vyprodej")
          );

        /*await requestQueue.addRequest({
          url: "https://www.eva.cz/oddeleni/bila-technika/",
          userData: {
            label: "CATEGORY",
            first: 0
          }
        });*/
        await enqueueRequests(requestQueue, links, {
          label: "CATEGORY",
          first: 0
        });
        stats.categories += links.length;
        console.log(`${request.url} Found ${links.length} categories`);
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

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "eva.cz");
    log.info("invalidated Data CDN");
    await uploadToKeboola("eva_cz");
    log.info("upload to Keboola finished");
  }
});
