import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { extractItems } from "./src/itemParser.js";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

const s3 = new S3Client({ region: "eu-central-1" });

const web = "https://www.czc.cz";
const { log } = Apify.utils;

let stats = {};
const processedIds = new Set();

Apify.main(async () => {
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  // Get queue and enqueue first url.
  const input = await Apify.getInput();
  const {
    development = false,
    debug = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL",
    bfURL = "https://www.czc.cz/blackfriday/produkty"
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const requestQueue = await Apify.openRequestQueue();

  if (development || debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  if (type === "FULL") {
    await requestQueue.addRequest({
      url: "https://www.czc.cz/",
      userData: {
        label: "START"
      }
    });
    /* await requestQueue.addRequest({
            url: 'https://www.czc.cz/mesh/produkty',
            userData: {
                label: 'PAGE',
                baseUrl: 'https://www.czc.cz/mesh/produkty',
            },
        }); */
  } else if (type === "BF") {
    await requestQueue.addRequest({
      url: bfURL,
      userData: {
        label: "BF"
      }
    });
  } else if (type === "TEST") {
    await requestQueue.addRequest({
      url: "https://www.czc.cz/bryle-pro-telefony-virtualni-realita/produkty",
      userData: {
        label: "PAGE",
        baseUrl:
          "https://www.czc.cz/bryle-pro-telefony-virtualni-realita/produkty"
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
    handlePageTimeoutSecs: 60,
    handlePageFunction: async ({ request, session, $, response }) => {
      if (response.statusCode !== 200 && response.statusCode !== 404) {
        log.info(`${request.url} -> Bad response code: ${response.statusCode}`);
        session.retire();
      }
      if (request.userData.label === "START") {
        const items = [];
        $(".main-menu__category a").each(function () {
          const categoryUrl = `${web}${$(this).attr("href")}`;
          // they got sometime some fuckups in the urls
          if (categoryUrl.indexOf("?/") !== -1) {
            items.push(categoryUrl.split("?/")[0]);
          } else {
            items.push(categoryUrl);
          }
        });
        stats.categories += items.length;
        console.log(`Found ${items.length} valid urls, going to enqueue them.`);
        for (const categoryUrl of items) {
          await requestQueue.addRequest({
            url: categoryUrl,
            userData: {
              label: "PAGE",
              baseUrl: categoryUrl
            }
          });
        }
      } else if (request.userData.label === "BF") {
        try {
          const items = await extractItems($, request, web);
          console.log(`Found ${items.length} storing them, ${request.url}`);
          await Apify.pushData(items);
        } catch (e) {
          console.log(e.message);
          console.log(`Failed extraction of items. ${request.url}`);
        }

        if ($("div.order-by-sum").length !== 0) {
          const max = parseInt(
            $("div.order-by-sum").text().replace(/\s+/g, "").match(/\d+/)[0]
          );
          const paginationCount = Math.ceil(max / 27) * 27;
          // https://www.czc.cz/black-friday-2019/produkty?q-first=99
          for (let i = 27; i < paginationCount; i += 27) {
            const paginationUrl = `${bfURL}?q-first=${i}`;
            await requestQueue.addRequest({
              url: paginationUrl,
              userData: {
                label: "PAGE"
              }
            });
          }
        }
      } else if (request.userData.label === "PAGE") {
        log.debug(`START with page ${request.url}`);
        stats.pages++;
        try {
          // we don't want to enqueu pagination on every page
          if (
            request.url.indexOf("q-first=") === -1 &&
            $("div.order-by-sum").length !== 0
          ) {
            const max = parseInt(
              $("div.order-by-sum").text().replace(/\s+/g, "").match(/\d+/)[0]
            );
            const paginationCount = Math.ceil(max / 27) * 27;

            console.log(
              `Adding the pagination to the queue for the ${request.url} for max ${paginationCount}`
            );
            for (let i = 27; i < paginationCount; i += 27) {
              const { baseUrl } = request.userData;
              let paginationUrl = null;
              if (baseUrl.indexOf("?") !== -1) {
                paginationUrl = `${baseUrl}&q-first=${i}`;
              } else {
                paginationUrl = `${baseUrl}/?q-first=${i}`;
              }
              await requestQueue.addRequest({
                url: paginationUrl,
                userData: {
                  label: "PAGE"
                }
              });
            }
          }
        } catch (e) {
          log.info(`Error on page ${request.url}`);
          log.error(e);
        }

        // there are some kategorie urls with the rosters
        try {
          if (request.url.endsWith("kategorie")) {
            const subCategoryUrls = [];
            $("a.scard-anim").each(function () {
              const subCategoryUrl =
                $(this).attr("href").indexOf("https") !== -1
                  ? $(this).attr("href")
                  : `${web}${$(this).attr("href")}`;
              console.log(subCategoryUrl);
              subCategoryUrls.push({
                url: subCategoryUrl,
                userData: {
                  label: "PAGE",
                  baseUrl: subCategoryUrl
                }
              });
            });
            stats.categories += subCategoryUrls.length;
            for (const item of subCategoryUrls) {
              await requestQueue.addRequest(item);
            }
          }
        } catch (e) {
          log.info(e.message);
        }

        try {
          const items = await extractItems($, request, web);
          // we don't need to block pushes, we will await them all at the end
          const requests = [];
          for (const product of items) {
            if (!processedIds.has(product.itemId)) {
              // Save data to dataset
              const s3item = { ...product };
              //Keboola data structure fix
              delete product.inStock;
              processedIds.add(product.itemId);
              requests.push(Apify.pushData(product), uploadToS3v2(s3, s3item));
              stats.items++;
            } else {
              stats.itemsDuplicity++;
            }
          }
          log.debug(
            `Found ${requests.length / 2} unique products, ${request.url}`
          );
          // await all requests, so we don't end before they end
          await Promise.allSettled(requests);
        } catch (e) {
          log.error(e);
          log.info(`Failed extraction of items. ${request.url}`);
          stats.failed++;
        }
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed 10 times`);
    }
  });
  // Run crawler.
  await crawler.run();

  console.log("crawler finished");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    try {
      await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "czc.cz");
      log.info("invalidated Data CDN");
      await uploadToKeboola(type === "BF" ? "czc_bf" : "czc");
      log.info("upload to Keboola finished");
    } catch (e) {
      console.log(e);
    }
  }

  console.log("Finished.");
});
