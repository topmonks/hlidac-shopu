import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { S3Client } from "@aws-sdk/client-s3";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { gotScraping } from "got-scraping";
import httpRequest from "@apify/http-request";
import cheerio from "cheerio";
import UserAgent from "user-agents";
import { extractItems, parseDetail } from "./src/detailParser.js";
import getCountry from "./src/countryProvider.js";
import { parseTrhakDetail } from "./src/trhakDetailParser.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const {
  utils: { log }
} = Apify;

const LABEL = {
  PAGE: "PAGE",
  TRHAK: "TRHAK",
  TRHAK_DNE: "TRHAK_DETAIL",
  LEFT_MENU: "LEFTMENU",
  XML: "XML",
  FEED: "FEED",
  BLACK_FRIDAY: "BF"
};

const TYPE = {
  FULL: "FULL",
  TRHAK: "TRHAK",
  FEED: "FEED",
  BLACK_FRIDAY: "BF",
  TEST: "TEST"
};

async function enqueueRequests(requestQueue, items, foreFront = false) {
  for (const item of items) {
    await requestQueue.addRequest(item, { forefront: foreFront });
  }
}

async function handleLeftMenu({ $, request }, domain, requestQueue, stats) {
  const menuItems = [];
  // add the left menu
  $("ul.fmenu>li").each(function () {
    // remove tag NOVE so it doenst make mess further
    if ($(this).find("span.new").lenght !== 0) {
      $(this).find("span.new").remove();
    }
    const sourceCategory = $(this).find("a[title]").text().trim();
    $(this)
      .find("a")
      .each(function () {
        const urlParam = $(this).attr("href") ? $(this).attr("href") : null;
        if (urlParam) {
          const menuItem = {
            sourceCategory
          };
          if (urlParam.indexOf(domain.baseUrl) === -1) {
            menuItem.url = `${domain.baseUrl}${urlParam}`;
          } else {
            menuItem.url = urlParam;
          }
          if (!menuItem.url.includes("black-friday")) {
            menuItems.push({
              url: menuItem.url,
              userData: {
                label: LABEL.PAGE,
                category: menuItem.sourceCategory,
                baseUrl: menuItem.url
              }
            });
          }
        }
      });
  });
  log.info(`Found ${menuItems.length} LEFT MENU at page ${request.url}`);
  stats.add("categories", menuItems.length);
  await enqueueRequests(requestQueue, menuItems);
}

async function handlePage(
  { request, $ },
  country,
  type,
  domain,
  requestQueue,
  stats,
  currency,
  development,
  s3
) {
  // wait for pagination and dont enqueue pagination always

  if (
    request.url.match(/-p\d+\.htm/) === null &&
    request.url.match(/pg=\d+/) === null
  ) {
    try {
      const paginationItems = [];
      if ($("div#pagerbottom").length !== 0) {
        const url = request.url.split(/\//);
        url.pop();
        $('div#pagerbottom a[class="pgn"]').each(function () {
          const paginationUrl = $(this).attr("href");
          if (paginationUrl.indexOf("/") === -1) {
            paginationItems.push(`${url.join("/")}/${paginationUrl}`);
          } else {
            paginationItems.push(url.join("/") + paginationUrl);
          }
        });
      }
      if (
        $("span#lblNumberItem").length !== 0 &&
        $("span#lblNumberItem").text().replace(/\s/g, "").match(/\d+/) !== null
      ) {
        const max = Math.ceil(
          parseInt(
            $("span#lblNumberItem").text().replace(/\s/g, "").match(/\d+/)[0],
            10
          ) / 24
        );
        log.info(`Adding ${max - 1}x pagination pages `);
        stats.add("pages", max);
        for (let i = 2; i <= max; i++) {
          const url = `${request.userData.baseUrl.replace(
            /\.htm/,
            `-p${i}.htm`
          )}`;
          await requestQueue.addRequest(
            {
              url,
              userData: {
                label: LABEL.PAGE,
                category: request.userData.category
                  ? request.userData.category
                  : null,
                baseUrl: request.userData.baseUrl
              }
            },
            { forefront: true }
          );
        }
      }

      // add pages to the queue
      for (const keyword of paginationItems) {
        await requestQueue.addRequest({
          url: keyword,
          userData: {
            label: LABEL.PAGE,
            category: request.userData.category
              ? request.userData.category
              : null,
            baseUrl: request.userData.baseUrl
          }
        });
      }
    } catch (e) {
      log.error(`Error on page ${request.url}`);
      log.error(e.message);
    }
  }

  try {
    const items = await extractItems(
      $,
      log,
      request,
      country,
      domain,
      requestQueue
    );
    if (items !== true) {
      log.info(`Found ${items.length} storing them, ${request.url}`);
      stats.add("items", items.length);
      for (const product of items) {
        const slug = await s3FileName(product);
        if (!development) {
          await uploadToS3v2(s3, product, {
            priceCurrency: currency,
            slug,
            inStock: true
          });
        }
        await Apify.pushData(product);
      }
    } else {
      log.info(`No complete items found, ${request.url}`);
    }
    if (items.length === 0 && items !== true) {
      await Apify.utils.sleep(2000);
      stats.inc("zeroItems");
      const fileName = `denied_products_${Math.random()}`;
      log.info(
        `Store bad items lenght into OUTPUT ${request.url} ----- ${fileName}`
      );
      await Apify.setValue(fileName, $("body").html(), {
        contentType: "text/html"
      });
      throw new Error("Items not loaded, retrying.");
    }
  } catch (e) {
    // no items on the page check it out
    log.error(e.message);
    await Apify.setValue(`no_items_${Math.random()}`, $("body").html(), {
      contentType: "text/html"
    });
    throw new Error("Items not loaded, retrying.");
  }
}

async function handleDetail(
  { request, $ },
  country,
  currency,
  stats,
  development,
  s3
) {
  const detailItem = await parseDetail($, request);
  stats.inc("details");
  if (!development) {
    await uploadToS3v2(s3, detailItem, {
      priceCurrency: currency,
      inStock: true
    });
  }
  await Apify.pushData(detailItem);
}

async function handleBF(
  { request, $ },
  domain,
  requestQueue,
  country,
  session
) {
  const lblNumberItem = $("span#lblNumberItem");
  if (
    lblNumberItem.length !== 0 &&
    lblNumberItem.text().replace(/\s/g, "").match(/\d+/) !== null
  ) {
    const max = Math.ceil(
      parseInt(lblNumberItem.text().replace(/\s/g, "").match(/\d+/)[0]) / 24
    );
    if (typeof max !== "number") {
      request.retryCount--;
      session.retire();
      throw new Error("Bad start.");
    }
    for (let i = 1; i <= max; i++) {
      await requestQueue.addRequest({
        url: `https://www.alza.${country.toLowerCase()}/Services/EShopService.svc/Filter`,
        uniqueKey: i.toString(),
        userData: {
          label: LABEL.PAGE,
          log: i,
          payload: {
            idCategory: 1,
            producers: "",
            parameters: [],
            idPrefix: 0,
            prefixType: 4,
            page: i,
            pageTo: i,
            inStock: false,
            newsOnly: false,
            commodityStatusType: 1,
            upperDescriptionStatus: 0,
            branchId: -2,
            sort: 0,
            categoryType: 29,
            searchTerm: "",
            sendProducers: false,
            layout: 1,
            append: false,
            leasingCatId: null,
            yearFrom: null,
            yearTo: null,
            artistId: null,
            minPrice: -1,
            maxPrice: -1,
            shouldDisplayVirtooal: false,
            callFromParametrizationDialog: false,
            commodityWearType: null,
            hash: `#f&cst=1&cud=0&pg=${i}-${i}&prod=`,
            counter: 1
          }
        }
      });
    }
  } else {
    request.retryCount--;
    session.retire();
    throw new Error("Bad start.");
  }
}

/**
 *
 * @param {HandleRequestInput} input
 * @param {URL} domain
 * @param {RequestQueue} requestQueue
 * @returns {Promise<void>}
 */
async function handleTrhak({ request, $ }, domain, requestQueue) {
  const trhakDetail = $("#dailySlasher");
  if (trhakDetail.length !== 0) {
    const linkDetail = $("div.c1 > a");
    await requestQueue.addRequest({
      url: `${domain.baseUrl}${linkDetail.attr("href")}`,
      userData: {
        label: LABEL.TRHAK_DNE
      }
    });
  }
  if (!request.userData.processed) {
    const trhaks = [];
    $("#or-daily a").each(function () {
      trhaks.push({
        url: `${domain.baseUrl}${$(this).attr("href")}`,
        userData: {
          label: LABEL.TRHAK,
          processed: true
        }
      });
    });
    await enqueueRequests(requestQueue, trhaks);
  }
}

async function handleTrhakDetail(
  { request, $ },
  domain,
  country,
  currency,
  development,
  s3
) {
  const detailItem = await parseTrhakDetail($, domain, request);
  if (!development) {
    await uploadToS3v2(s3, detailItem, {
      priceCurrency: currency,
      inStock: true
    });
  }
  await Apify.pushData(detailItem);
}

async function handleFeed(items, stats, s3, options = {}) {
  const {
    uploadBatchSize = 5000,
    uploadSleepMs = 500,
    outputDatasetIdOrName = "",
    parallelPushes = 1,
    development = false
  } = options;
  let isMigrating = false;
  Apify.events.on("migrating", () => {
    isMigrating = true;
  });

  const kvRecordName = `STATE-PUSHED-COUNT-${outputDatasetIdOrName}`;
  let pushedItemsCount = (await Apify.getValue(kvRecordName)) || 0;
  const dataset = await Apify.openDataset(outputDatasetIdOrName);

  for (let i = pushedItemsCount; i < items.length; i += uploadBatchSize) {
    if (isMigrating) {
      log.info("Forever sleeping until migration");
      // Do nothing
      await new Promise(() => {});
    }
    const itemsToPush = items.slice(i, i + uploadBatchSize);
    log.info(
      `Pushing ${itemsToPush.length} from index ${i} to ${i + uploadBatchSize}`
    );

    const formattedItems = [];
    const s3Requests = [];
    for (const item of itemsToPush) {
      const detailItem = {
        itemId: item.itemId,
        itemName: item.itemName,
        itemUrl: item.itemUrl,
        img: item.img,
        inStock: true,
        currentPrice: item.currentPrice,
        originalPrice: item.originalPrice,
        currency: item.currency,
        category: item.Category.join(" > "),
        discounted: item.discounted === "true",
        itemCode: item.itemCode,
        rating: item.rating
      };
      formattedItems.push(detailItem);
      if (!development) {
        s3Requests.push(uploadToS3v2(s3, detailItem));
      }
    }

    const pushPromises = [];
    const parallelizedBatchSize = Math.ceil(
      formattedItems.length / parallelPushes
    );
    for (let j = 0; j < parallelPushes; j++) {
      const start = j * parallelizedBatchSize;
      const end = (j + 1) * parallelizedBatchSize;
      const parallelPushChunk = formattedItems.slice(start, end);
      pushPromises.push(dataset.pushData(parallelPushChunk));
    }
    // We must update it before awaiting the promises because the push can take time
    // and migration can cut us off but the items will already be on the way to dataset
    pushedItemsCount += formattedItems.length;
    await Apify.setValue(kvRecordName, pushedItemsCount);
    await Promise.all(pushPromises);
    await Promise.allSettled(s3Requests);
    stats.add("items", formattedItems.length);
    await Apify.utils.sleep(uploadSleepMs);
  }
}

async function callKeboolaUpload(country, type) {
  const countryLower = country.toLowerCase();
  let tableName = "alza";
  if (type === "FULL" && countryLower !== "cz") {
    tableName = `${tableName}_${countryLower}`;
  } else if (type === "BF") {
    tableName = `${tableName}_${countryLower}_bf`;
  } else if (type === "FEED") {
    tableName = `${tableName}_${countryLower}_feed`;
  }
  try {
    await uploadToKeboola(tableName);
  } catch (e) {
    log.error(e);
  }
}

Apify.main(async () => {
  rollbar.init();

  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const s3 = new S3Client({ region: "eu-central-1" });
  const userAgent = new UserAgent();

  const input = await Apify.getInput();
  const {
    development = false,
    country = "CZ",
    type = "FULL",
    maxConcurrency = 30,
    maxRequestRetries = 5,
    handleRequestTimeoutSecs = 60,
    uploadBatchSize = 5000,
    uploadSleepMs = development ? 100 : 1500,
    parallelPushes = 20,
    feedUrls = []
  } = input ?? {};

  if (!country) {
    throw new Error(
      "You need to specify the country on the input. Expecting DE/HU/AT/UK/CZ/SK"
    );
  }

  const domain = getCountry(country);
  const apifyProxyGroups = domain.proxies;
  const currency = domain.currency;

  const requestQueue = await Apify.openRequestQueue();
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: apifyProxyGroups
  });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    details: 0,
    duplicates: 0,
    pages: 0,
    items: 0,
    target: 0,
    targetPages: 0,
    denied: 0,
    captchas: 0,
    ok: 0,
    zeroItems: 0
  });

  if (type === TYPE.FULL) {
    await requestQueue.addRequest({
      url: `${domain.baseUrl}/`,
      userData: {
        label: LABEL.LEFT_MENU
      },
      uniqueKey: Math.random().toString()
    });
    await requestQueue.addRequest({
      url: `${domain.baseUrl}/_sitemap-categories.xml`,
      userData: {
        label: LABEL.XML
      }
    });
  } else if (type === TYPE.TRHAK) {
    const urlsList = [
      `${domain.baseUrl}/trhakdne`,
      `${domain.baseUrl}/pet/trhakdne`,
      `${domain.baseUrl}/hobby/trhakdne`,
      `${domain.baseUrl}/sport/trhakdne`,
      `${domain.baseUrl}/hracky/trhakdne`,
      `${domain.baseUrl}/media/trhakdne`,
      `${domain.baseUrl}/beauty/trhakdne`,
      `${domain.baseUrl}/maxi/trhakdne`,
      `${domain.baseUrl}/auto/trhakdne`
    ];
    for (let i = 0; i < urlsList.length; i++) {
      await requestQueue.addRequest({
        url: urlsList[i],
        userData: {
          label: LABEL.TRHAK
        }
      });
    }
  } else if (type === TYPE.FEED) {
    for (const feedUrl of feedUrls) {
      await requestQueue.addRequest({
        url: feedUrl,
        userData: {
          label: LABEL.FEED
        }
      });
    }
  } else if (type === TYPE.BLACK_FRIDAY) {
    await requestQueue.addRequest({
      url: `https://www.alza.${country.toLowerCase()}/black-friday`,
      userData: {
        label: LABEL.BLACK_FRIDAY
      }
    });
  } else if (type === TYPE.TEST) {
    const testUrl = "https://www.alza.cz/kuchynske-roboty/18850372.htm";
    await requestQueue.addRequest({
      url: testUrl,
      userData: {
        label: LABEL.PAGE,
        baseUrl: testUrl
      }
    });
  }

  function isMalformedUrl(url, countryCode) {
    return !url.includes(`alza.${countryCode}/`);
  }

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    // proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 50,
      persistStateKeyValueStoreId: "alza-sessions"
    },
    // persistCookiesPerSession: true,
    maxConcurrency: development ? 1 : maxConcurrency,
    maxRequestRetries,
    handleRequestTimeoutSecs,
    async handleRequestFunction(context) {
      const { request, session } = context;
      const { label, payload } = request.userData;

      log.info(`Visiting: ${request.url}, ${label}`);
      if (
        (label !== "START" || label !== "BF") &&
        type !== "FEED" &&
        isMalformedUrl(request.url, country.toLowerCase())
      ) {
        log.info(`Malformed url ignored: ${request.url}`);
        return; // do not process malformed url eg https://www.alza.czvlacky/18857232.htm
      }

      let response, parsedResponse, cheerioContext;
      if (label === "FEED") {
        response = await gotScraping({
          responseType: "json",
          timeout: {
            response: handleRequestTimeoutSecs * 1000,
            request: handleRequestTimeoutSecs * 1000
          },
          url: request.url
        });
        // Status code check
        if (![200, 404].includes(response.statusCode)) {
          session.retire();
          await Apify.setValue(`big${request.userData.log}`, response.body);
          request.retryCount--;
          throw new Error(
            `We got blocked by target on ${request.url}, ${response.statusCode}`
          );
        }
      } else {
        if (type === "BF" && label === "PAGE") {
          try {
            const data = JSON.stringify(payload);
            const response = await httpRequest({
              url: request.url,
              method: "POST",
              proxyUrl: await proxyConfiguration.newUrl(session.id),
              payload: data,
              headers: {
                "User-Agent": userAgent(),
                accept: "application/json, text/javascript, */*; q=0.01",
                "Content-type": "application/json",
                Referer: `https://www.alza.${country.toLowerCase()}/black-friday`,
                origin: `https://www.alza.${country.toLowerCase()}`,
                "Content-Length": data.length,
                Host: `www.alza.${country.toLowerCase()}`
              }
            });

            // Status code check
            if (![200, 404].includes(response.statusCode)) {
              session.retire();
              await Apify.setValue(`big${request.userData.log}`, response.body);
              request.retryCount--;
              throw new Error(
                `We got blocked by target on ${request.url}, ${response.statusCode}`
              );
            }

            try {
              parsedResponse = JSON.parse(response.body);
            } catch (e) {
              log.error(
                `ERROR page:${request.userData.log}, ${response.statusCode}`
              );
              await Apify.setValue(`big${request.userData.log}`, response.body);
              throw new Error(e.message);
            }
            const $ = cheerio.load(parsedResponse.d.Boxes);
            context.$ = $;
          } catch (e) {
            log.error(e.message);
            log.error(
              `ERROR page:${request.userData.log}, ${response.statusCode}`
            );
            await Apify.setValue(`big${request.userData.log}`, response.body);
            throw new Error(e.message);
          }
        } else {
          try {
            response = await gotScraping.post({
              headerGeneratorOptions: {
                browsers: [
                  {
                    name: "chrome",
                    minVersion: 89
                  }
                ],
                devices: ["desktop"],
                locales: ["cs-CZ"],
                operatingSystems: ["windows"]
              },
              url: request.url,
              proxyUrl: proxyConfiguration.newUrl(session.id),
              headers: {
                "User-Agent": userAgent(),
                "Accept-Language":
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
                "Upgrade-Insecure-Requests": 1,
                Referer: "https://www.google.com/"
              }
            });
          } catch (e) {
            log.error(e);
            await Apify.utils.sleep(5000);
            stats.inc("denied");
            request.retryCount--;
            session.isBlocked();
            throw new Error("Proxy blocked");
          }
          const { body } = response;

          // for this we don't need to parse the response in cheerio
          if (request.userData.label === "XML") {
            const categoryUrls = body.match(domain.regex);
            if (!categoryUrls) return;

            log.info(`Adding to the queue ${categoryUrls.length} from XML`);
            stats.add("categories", categoryUrls.length);
            for (const url of categoryUrls) {
              await requestQueue.addRequest({
                url,
                userData: {
                  label: "PAGE",
                  baseUrl: url
                }
              });
            }
          } else {
            const $ = cheerio.load(body);
            context.$ = $;
            if ($(".captcha-mid").length !== 0) {
              stats.inc("captchas");
              request.retryCount--;
              session.retire();
              throw new Error("Captcha Encountered");
            }

            if ($("h1").eq(0).text() === "403 Forbidden") {
              await Apify.utils.sleep(5000);
              stats.inc("denied");
              request.retryCount--;
              session.retire();
              throw new Error("Access Denied");
            }

            stats.inc("ok");
            session.setCookiesFromResponse(response);
          }
        }
      }

      switch (label) {
        case "LEFTMENU":
          return handleLeftMenu(context, domain, requestQueue, stats);
        case "PAGE":
          return handlePage(
            context,
            country,
            type,
            domain,
            requestQueue,
            stats,
            currency,
            development,
            s3
          );
        case "DETAIL":
          return handleDetail(
            context,
            country,
            currency,
            stats,
            development,
            s3
          );
        case "BF":
          return handleBF(context, domain, requestQueue, country, session);
        case "TRHAK":
          return handleTrhak(context, domain, requestQueue);
        case "TRHAK_DETAIL":
          return handleTrhakDetail(
            context,
            domain,
            country,
            currency,
            development,
            s3
          );
        case "FEED":
          log.info(`Items count: ${response.body.items[0].length}`);
          stats.inc("pages");
          return handleFeed(response.body.items[0], stats, s3, {
            uploadBatchSize,
            uploadSleepMs,
            parallelPushes,
            outputDatasetIdOrName: Math.random().toString(),
            development
          });
      }
    },
    // If request failed 4 times then this function is executed.
    async handleFailedRequestFunction({ request, error }) {
      log.error(`Request ${request.url} ${error.message} failed 4 times`);
    }
  });

  // Run crawler.
  await crawler.run();

  await stats.save();
  if (!development) {
    log.info("Crawler finished, calling upload.");
    await Promise.allSettled([
      invalidateCDN(
        cloudfront,
        "EQYSHWUECAQC9",
        `alza.${country.toLowerCase()}`
      ),
      callKeboolaUpload(country, type)
    ]);
    log.info("invalidated Data CDN");
  }

  log.info("Finished.");
});
