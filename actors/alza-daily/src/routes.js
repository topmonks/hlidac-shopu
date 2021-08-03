const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");

const Apify = require("apify");
const { extractItems, parseDetail } = require("./detailParser");
const { parseTrhakDetail } = require("./trhakDetailParser");

const {
  utils: { log }
} = Apify;

async function enqueueRequests(requestQueue, items, foreFront = false) {
  for (const item of items) {
    await requestQueue.addRequest(item, { forefront: foreFront });
  }
}

exports.handleStart = async (
  { request, $, session },
  domain,
  requestQueue,
  stats
) => {
  const tabItems = [];
  $("ul.tabs li a").each(function () {
    const link = $(this).attr("href");
    if (!link.match(/https/)) {
      const finalLink = `${domain.baseUrl}${link}`;
      if (!finalLink.includes("black-friday")) {
        tabItems.push({
          url: finalLink,
          userData: {
            label: "LEFTMENU"
          },
          uniqueKey: Math.random().toString()
        });
      }
    }
  });
  log.info(`Found ${tabItems.length} START MENU at page ${request.url}`);
  if (tabItems.length === 0) {
    stats.denied++;
    request.retryCount--;
    session.isBlocked();
    throw new Error("Access Denied");
  }

  await enqueueRequests(requestQueue, tabItems, true);

  await requestQueue.addRequest({
    url: `${domain.baseUrl}/_sitemap-categories.xml`,
    userData: {
      label: "XML"
    }
  });
};

exports.handleLeftMenu = async ({ $, request }, domain, requestQueue) => {
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
  await enqueueRequests(requestQueue, menuItems);
};

exports.handlePage = async (
  { request, $ },
  country,
  type,
  domain,
  requestQueue,
  stats,
  currency
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
        for (let i = 2; i <= max; i++) {
          const url = `${request.userData.baseUrl.replace(
            /\.htm/,
            `-p${i}.htm`
          )}`;
          await requestQueue.addRequest({
            url,
            userData: {
              label: "PAGE",
              category: request.userData.category
                ? request.userData.category
                : null,
              baseUrl: request.userData.baseUrl
            }
          });
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
      log.error(e);
    }
  }

  try {
    const items = await extractItems($, request, country, domain, requestQueue);
    // log.info(`Found ${items.length} storing them, ${request.url}`);
    if (items !== true) {
      for (const product of items) {
        await uploadToS3(
          s3,
          `alza.${country.toLowerCase()}`,
          await s3FileName(product),
          "jsonld",
          toProduct(
            {
              ...product,
              inStock: true
            },
            { priceCurrency: currency }
          )
        );
      }

      await Apify.pushData(items);
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

exports.handleDetail = async ({ request, $ }, country, currency) => {
  const detailItem = await parseDetail($, request);
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
  await Apify.pushData(detailItem);
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
  currency
) => {
  const detailItem = await parseTrhakDetail($, domain, request);
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
  await Apify.pushData(detailItem);
};
