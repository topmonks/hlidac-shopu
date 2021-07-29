const Apify = require("apify");
const { log, requestAsBrowser } = Apify.utils;
let stats = {};
const processedIds = new Set();
const HOST = "https://www.eva.cz";

const completeUrl = x => `${HOST}${x}`;

async function enqueuRequests(requestQueue, urls, userData) {
  console.log(urls);
  for (const url of urls) {
    await requestQueue.addRequest({
      url: url,
      userData: userData
    });
  }
}

async function handlePagination($, request, requestQueue) {
  const nextPagination = $("ul.pagination i.fa-angle-right");
  if (nextPagination.length > 0) {
    const nextFirst = request.userData.first + 36;
    const url = new URL(request.url);
    url.searchParams.set("first", nextFirst.toString());
    url.search = url.searchParams.toString();
    console.log(`Adding the pagination page to the queue ${url.toString()}`);
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

function parseItem($) {
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
        originalPrice: null,
        inStock: $el
          .find("div.st_onstore")
          .text()
          .toLowerCase()
          .includes("skladem")
      };
    }
  };
}

async function handleItems($) {
  const items = $("#content_list div.zitembox")
    .get()
    .map(parseItem($))
    .filter(function (element) {
      //remove undefined due to unpacked/used items
      return element !== undefined;
    });
  console.log(items);
}

Apify.main(async () => {
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
    //await countAllProducts(rootUrl);
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
        console.log(`${request.url} PAGE`);
        await handleItems($);
      } else if (request.userData.label === "CATEGORY") {
        console.log(`${request.url} PARENT`);
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
            await enqueuRequests(requestQueue, subcategories, {
              label: "CATEGORY",
              first: 0
            });
          }

          //Check if there is next pagination
          await handlePagination($, request, requestQueue);
          //Scrap products from page
          await handleItems($);
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

        await requestQueue.addRequest({
          url: "https://www.eva.cz/oddeleni/cistici-prostredky-na-koberce/",
          userData: {
            label: "CATEGORY",
            first: 0
          }
        });
        /*await enqueuRequests(requestQueue, links.splice(0, 1), {
          label: "CATEGORY",
          first: 0
        });*/
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
});
