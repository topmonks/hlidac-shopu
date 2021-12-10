const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const {
  toProduct,
  uploadToS3,
  uploadToS3v2,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");

const Apify = require("apify");
const { extractItems, parseDetail } = require("./detailParser");
const { parseTrhakDetail } = require("./trhakDetailParser");
const cheerio = require("cheerio");

const {
  utils: { log }
} = Apify;

async function enqueueRequests(requestQueue, items, foreFront = false) {
  for (const item of items) {
    await requestQueue.addRequest(item, { forefront: foreFront });
  }
}

exports.handleLeftMenu = async (
  { $, request },
  domain,
  requestQueue,
  stats
) => {
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
                label: "PAGE",
                category: menuItem.sourceCategory,
                baseUrl: menuItem.url
              }
            });
          }
        }
      });
  });
  log.info(`Found ${menuItems.length} LEFT MENU at page ${request.url}`);
  stats.categories += menuItems.length;
  await enqueueRequests(requestQueue, menuItems);
};

exports.handlePage = async (
  { request, $ },
  country,
  type,
  domain,
  requestQueue,
  stats,
  currency,
  development
) => {
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
        stats.pages += max;
        for (let i = 2; i <= max; i++) {
          const url = `${request.userData.baseUrl.replace(
            /\.htm/,
            `-p${i}.htm`
          )}`;
          await requestQueue.addRequest(
            {
              url,
              userData: {
                label: "PAGE",
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
            label: "PAGE",
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
      stats.items += items.length;
      for (const product of items) {
        const slug = await s3FileName(product);
        if (!development) {
          await uploadToS3(
            s3,
            `alza.${country.toLowerCase()}`,
            slug,
            "jsonld",
            toProduct(
              {
                ...product,
                slug,
                inStock: true
              },
              { priceCurrency: currency }
            )
          );
        }
        await Apify.pushData(product);
      }
    } else {
      log.info(`No complete items found, ${request.url}`);
    }
    if (items.length === 0 && items !== true) {
      await Apify.utils.sleep(2000);
      stats.zeroItems++;
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
};

exports.handleDetail = async (
  { request, $ },
  country,
  currency,
  stats,
  development
) => {
  const detailItem = await parseDetail($, request);
  stats.details++;
  if (!development) {
    await uploadToS3(
      s3,
      `alza.${country.toLowerCase()}`,
      await s3FileName(detailItem),
      "jsonld",
      toProduct(
        {
          ...detailItem,
          inStock: true
        },
        { priceCurrency: currency }
      )
    );
  }
  await Apify.pushData(detailItem);
};

exports.handleBF = async (
  { request, $ },
  domain,
  requestQueue,
  country,
  session
) => {
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
          label: "PAGE",
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
};

exports.handleTrhak = async ({ request, $ }, domain, requestQueue) => {
  const trhakDetail = $("#dailySlasher");
  if (trhakDetail.length !== 0) {
    const linkDetail = $("div.c1 > a");
    await requestQueue.addRequest({
      url: `${domain.baseUrl}${linkDetail.attr("href")}`,
      userData: {
        label: "TRHAK_DETAIL"
      }
    });
  }
  if (!request.userData.processed) {
    const trhaks = [];
    $("#or-daily a").each(function () {
      trhaks.push({
        url: `${domain.baseUrl}${$(this).attr("href")}`,
        userData: {
          label: "TRHAK",
          processed: true
        }
      });
    });
    await enqueueRequests(requestQueue, trhaks);
  }
};

exports.handleTrhakDetail = async (
  { request, $ },
  domain,
  country,
  currency,
  development
) => {
  const detailItem = await parseTrhakDetail($, domain, request);
  if (!development) {
    await uploadToS3(
      s3,
      `alza.${country.toLowerCase()}`,
      await s3FileName(detailItem),
      "jsonld",
      toProduct(
        {
          ...detailItem,
          inStock: true
        },
        { priceCurrency: currency }
      )
    );
  }
  await Apify.pushData(detailItem);
};

exports.handleFeed = async (
  items,
  outputDatasetIdOrName,
  stats,
  options = {}
) => {
  const {
    uploadBatchSize = 5000,
    uploadSleepMs = 1000,
    country = "CZ",
    development = false
  } = options;
  let isMigrating = false;
  Apify.events.on("migrating", () => {
    isMigrating = true;
  });

  let pushedItemsCount = 0;

  for (let i = pushedItemsCount; i < items.length; i += uploadBatchSize) {
    if (isMigrating) {
      log.info("Forever sleeping until migration");
      // Do nothing
      await new Promise(() => {});
    }
    const start = i;
    const end = i + uploadBatchSize;
    const itemsToPush = items.slice(start, end);

    log.info(`Pushing ${itemsToPush.length} from index ${start} to ${end}`);

    let formattedItems = [];
    let s3Requests = [];
    for (const item of itemsToPush) {
      const detailItem = {
        "itemId": item.itemId,
        "itemName": item.itemName,
        "itemUrl": item.itemUrl,
        "img": item.img,
        "inStock": true,
        "currentPrice": item.currentPrice,
        "originalPrice": item.originalPrice,
        "currency": item.currency,
        "category": item.Category.join(" > "),
        "discounted": item.discounted === "true",
        "itemCode": item.itemCode,
        "rating": item.rating
      };
      formattedItems.push(detailItem);
      if (!development) {
        s3Requests.push(uploadToS3v2(detailItem, {}));
      }
    }

    // await all requests, so we don't end before they end
    await Apify.pushData(formattedItems);
    await Promise.allSettled(s3Requests);
    stats.items += formattedItems.length;
    await Apify.utils.sleep(uploadSleepMs);
  }
};
