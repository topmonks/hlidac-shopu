const Apify = require("apify");
const CloudFlareUnBlocker = require("./cloudflare-unblocker");
const getItems = require("./itemParser");

/** @typedef { import("./apify.json").ApifyEnv } ApifyEnv */
/** @typedef { import("./apify.json").ActorRun } ActorRun */
/** @typedef { import("./apify.json").CheerioHandlePageInputs } CheerioHandlePageInputs */
/** @typedef { import("./apify.json").RequestQueue } RequestQueue */
/** @typedef { import("./apify.json").RequestList } RequestList */
/** @typedef { import("./apify.json").ProxyConfiguration } ProxyConfiguration */

let jsonCategories = {};
const firstPage =
  "https://www.rohlik.cz/services/frontend-service/renderer/navigation/flat.json";

Apify.main(async () => {
  const input = await Apify.getInput();

  const {
    development,
    products = [],
    country = "cz",
    extensions = [],
    maxConcurrency = 10,
    sleep = 1,
    proxyGroups = ["CZECH_LUMINATI"]
  } = input ?? {};

  // Get queue and enqueue first url.
  const requestQueue = await Apify.openRequestQueue();
  await requestQueue.addRequest(
    new Apify.Request({
      url: firstPage,
      userData: { label: "main" }
    })
  );
  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: development ? undefined : proxyGroups,
    useApifyProxy: !development
  });
  const cloudFlareUnBlocker = new CloudFlareUnBlocker({
    unblockUrl: firstPage,
    proxyConfiguration
  });

  // Create crawler.
  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 5,
    useSessionPool: true,
    handleRequestFunction: async ({ request, session }) => {
      const response = await Apify.utils.requestAsBrowser({
        url: request.url,
        json: true,
        ...cloudFlareUnBlocker.getRequestOptions(session)
      });
      session.setCookiesFromResponse(response);
      const { statusCode, body } = response;
      if (statusCode !== 200 && statusCode !== 404) {
        session.retire();
        // dont mark this request as bad, it is probably looking for working session
        request.retryCount--;
        // dont retry the request right away, wait a little bit
        await Apify.utils.sleep(5000);
        throw new Error("Session blocked, retiring.");
      }

      if (request.userData.label === "main") {
        const categories = Object.keys(body.navigation);
        jsonCategories = body.navigation;
        if (categories.length !== 0) {
          console.log(`Adding to the queue ${categories.length} of categories`);
          for (const category of categories) {
            await requestQueue.addRequest(
              new Apify.Request({
                url: `https://www.rohlik.cz/services/frontend-service/products/${category}?offset=0&limit=25`,
                userData: {
                  label: "list",
                  categoryId: category
                },
                uniqueKey: category.toString()
              })
            );
            const subCategories = body.navigation[category].children;
            subCategories.length &&
              console.log(
                `Adding to the queue ${subCategories.length} of subCategories`
              );
            for (const subCategory of subCategories) {
              await requestQueue.addRequest(
                new Apify.Request({
                  url: `https://www.rohlik.cz/services/frontend-service/products/${subCategory}?offset=0&limit=25`,
                  userData: {
                    label: "list",
                    categoryId: subCategory
                  },
                  uniqueKey: subCategory.toString()
                })
              );
            }
          }
        }
      } else if (request.userData.label === "list") {
        const max = Math.ceil(body.data.totalHits / 25) * 25;
        const { categoryId } = request.userData;
        max !== 0 &&
          console.log(
            `Adding to the queue ${max} for https://www.rohlik.cz/services/frontend-service/products/${categoryId}?offset=0&limit=25`
          );
        for (let i = 25; i <= max; i += 25) {
          await requestQueue.addRequest(
            new Apify.Request({
              url: `https://www.rohlik.cz/services/frontend-service/products/${categoryId}?offset=${i}&limit=25`,
              userData: {
                label: "PAGE",
                categoryId
              }
            })
          );
        }
        if (body.data && body.data.productList && body.data.productList !== 0) {
          console.log(
            `Stroring ${body.data.productList.length} items for category ${categoryId}`
          );
          await Apify.pushData(getItems(body.data.productList, jsonCategories));
        }
      } else if (request.userData.label === "PAGE") {
        const { categoryId } = request.userData;
        if (body.data && body.data.productList && body.data.productList !== 0) {
          console.log(
            `Stroring ${body.data.productList.length} items for category ${categoryId}`
          );
          await Apify.pushData(getItems(body.data.productList, jsonCategories));
        }
      }

      await Apify.utils.sleep(1000);
    },
    sessionPoolOptions: {
      maxPoolSize: 100,
      createSessionFunction: cloudFlareUnBlocker.createSessionFunction.bind(
        cloudFlareUnBlocker
      )
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed 4 times`);
    }
  });

  // Run crawler.
  await crawler.run();
});
