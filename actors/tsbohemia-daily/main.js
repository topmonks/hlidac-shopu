import { Actor, log, Dataset } from "apify";
import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

/** @enum {string} */
export const Labels = {
  START: "START",
  AFTER_START: "AFTER_START",
  BF: "BF",
  PAGE: "PAGE",
  PRICE: "PRICE",
  PRICE_START: "PRICE_START"
};

function prepareStartURLs({ type, feedUrl }) {
  const requestListSources = [];
  switch (type) {
    case ActorType.BlackFriday:
      {
        requestListSources.push({
          userData: { label: Labels.BF },
          url: "https://www.tsbohemia.cz/-black-friday_c41438.html"
        });
      }
      break;
    case Labels.PRICE:
      {
        requestListSources.push({
          url: feedUrl,
          userData: {
            label: Labels.PRICE_START
          }
        });
      }
      break;
    case ActorType.Test: {
      requestListSources.push({
        url: "https://www.tsbohemia.cz/elektronika-televize_c5622.html",
        userData: {
          label: Labels.PAGE,
          strid: 5622
        }
      });
      break;
    }
  }
  return requestListSources;
}

async function main() {
  rollbar.init();

  log.info("ACTOR - Start");
  const {
    proxyGroups = ["CZECH_LUMINATI"],
    type = Labels.PRICE,
    feedUrl = "https://s3.eu-central-1.amazonaws.com/data.hlidacshopu.cz/app/TSB-ids-december.csv",
    development
  } = await getInput();

  const stats = await withPersistedStats(x => x, {
    items: 0,
    failed: 0
  });

  log.info("ACTOR - setUp crawler");
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 200,
    maxConcurrency: 10,
    proxyConfiguration,
    additionalMimeTypes: ["text/csv"],
    persistCookiesPerSession: true,
    sessionPoolOptions: {
      sessionOptions: {
        maxUsageCount: 50
      }
    },
    async requestHandler({ request, log, body, crawler, json }) {
      log.info(`Processing ${request.url} (${request.userData.label})`);
      switch (request.userData.label) {
        case Labels.PRICE_START:
          {
            const ids = body
              .toString()
              .split("\n")
              .slice(1)
              .map(row => row.replace(/"/g, ""));
            const uploadBatchSize = 24;
            let pushedItemsCount = 0;

            const requests = [];
            for (
              let i = pushedItemsCount;
              i < ids.length;
              i += uploadBatchSize
            ) {
              const start = i;
              const end = i + uploadBatchSize;
              const itemsToPush = ids.slice(start, end);

              requests.push({
                url: "https://www.tsbohemia.cz/TsbStoitemPriceList_jx.asp",
                method: "POST",
                payload: `stiidlist=${itemsToPush.join(",")}`,
                headers: {
                  "accept": "*/*",
                  "accept-language": "cs,en-US;q=0.9,en;q=0.8",
                  "content-type":
                    "application/x-www-form-urlencoded; charset=UTF-8",
                  "sec-fetch-dest": "empty",
                  "sec-fetch-mode": "cors",
                  "sec-fetch-site": "same-origin",
                  "sec-gpc": "1",
                  "x-requested-with": "XMLHttpRequest",
                  "Referrer-Policy": "strict-origin-when-cross-origin"
                },
                userData: {
                  label: Labels.PRICE
                },
                uniqueKey: itemsToPush.toString()
              });
            }
            await crawler.requestQueue.addRequests(requests);
          }
          break;
        case Labels.PRICE:
          {
            const priceList = json.StoitemPriceList;
            const prices = priceList.map(price => {
              const item = {};
              item.itemId = price.StiId;
              item.currentPrice = Math.round(
                (price.StiPrice + price.PriceRef + price.PriceRef2) *
                  (1 + price.TaxRate / 100)
              );
              if (price.StiPrice === price.SipPrice0) {
                item.originalPrice = null;
                item.discounted = false;
              } else {
                item.originalPrice = Math.round(
                  (price.SipPrice0 + price.PriceRef + price.PriceRef2) *
                    (1 + price.TaxRate / 100)
                );
                item.discounted = true;
              }
              return item;
            });
            await Dataset.pushData(prices);
            log.info(`Found ${prices.length}x items price`);
            stats.add("items", prices.length);
          }
          break;
      }
    },
    async failedRequestHandler({ request, log }) {
      log.error(`Request ${request.url} failed multiple times`, request);
      stats.inc("failed");
    }
  });

  const startingRequests = prepareStartURLs({ type, feedUrl });
  log.info("ACTOR - Run crawler");
  await crawler.run(startingRequests);

  log.info("ACTOR - End crawler");

  await stats.save(true);
  log.debug("STATS saved!");

  if (!development) {
    let tableName = "tsbohemia";
    if (type === Labels.PRICE) {
      tableName = `${tableName}_cz_price`;
    } else if (type === ActorType.BlackFriday) {
      tableName = `${tableName}_bf`;
    }
    await uploadToKeboola(tableName);
  }

  log.info("ACTOR - Finished");
}

await Actor.main(main);
