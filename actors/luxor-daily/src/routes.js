const Apify = require("apify");
//const { URL } = require("url");
const { gotScraping } = require("got-scraping");
//const tools = require("./tools");

const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });

const processedIds = new Set();

const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");

const {
  URL_TEMPLATE_PRODUCT_LIST,
  URL_TEMPLATE_CATEGORY,
  URL_TEMPLATE_PRODUCT,
  URL_TEMPLATE_PAGE_URL,
  URL_IMAGE_BASE,
  URL_SITEMAP,
  PRODUCTS_PER_PAGE,
  LABELS,
  URL_FRONT
} = require("./const");
const cheerio = require("cheerio");

// const { s3FileName } = require("@hlidac-shopu/actors-common/product.js");

const {
  utils: { log }
} = Apify;

exports.handleAPIStart = async (context, crawlContext) => {
  console.log("---\nhandleStart");

  const requestOptions = {
    url: URL_TEMPLATE_CATEGORY,
    responseType: "json"
  };
  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }
  const { body } = await gotScraping(requestOptions);

  crawlContext.stats.requests++;

  const categories = body.data;

  // First page for all categories
  const PAGE = 1;

  for (const category in categories) {
    const slug = categories[category].slug;

    log.debug(slug);

    let url = URL_TEMPLATE_PRODUCT_LIST;
    url = url
      .replace(/{PAGE}/g, PAGE)
      .replace(/{PRODUCTS_PER_PAGE}/g, PRODUCTS_PER_PAGE)
      .replace(/{SLUG}/g, slug);

    const req = {
      url,
      userData: {
        label: LABELS.API_LIST,
        slug: slug,
        page: 1
      }
    };
    console.log("addRequest LIST / first page", req);

    crawlContext.requestQueue.addRequest(req);

    //log.debug("DEBUG BREAK / 1 category only");
    //break;
  }
};

exports.handleAPIList = async (context, crawlContext) => {
  const { request } = context;
  //console.log("---\nhandleList", request);
  const requestOptions = {
    url: request.url,
    responseType: "json"
  };
  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }
  const requestResult = await gotScraping(requestOptions);

  crawlContext.stats.requests++;

  const { body } = requestResult;

  switch (requestResult.statusCode) {
    case 200:
      crawlContext.stats.pages++;
      break;

    default:
      crawlContext.stats.failed++;
      break;
  }

  const products = body.data;
  const productTotalCount = body.total_count;

  const requests = [];

  for (const productIx in products) {
    const { id, title, author, publisher, current_variant_price_group } =
      products[productIx];

    //console.log(products[productIx]);

    const imgPath = products[productIx].hasOwnProperty("images")
      ? products[productIx].images.length
        ? products[productIx].images[0].url
        : ""
      : "";

    let originalPrice = null;
    let currentPrice = null;
    let currency = "CZK";

    const priceList = products[productIx].current_variant_price_group;
    for (const priceIx in priceList) {
      switch (priceList[priceIx].type) {
        case "RECOMMENDED":
          originalPrice = priceList[priceIx].with_vat;
          currency = priceList[priceIx].currency;
          break;

        case "SALE":
          currentPrice = priceList[priceIx].with_vat;
          currency = priceList[priceIx].currency;
          break;
      }
    }

    const product = {
      itemId: products[productIx].id,
      itemUrl: URL_TEMPLATE_PRODUCT.replace(/{SLUG}/, products[productIx].slug),
      itemName: products[productIx].title,

      currency,
      currentPrice,
      originalPrice,
      discounted: currentPrice < originalPrice,

      img: `${URL_IMAGE_BASE}${imgPath}`,
      inStock: products[productIx].in_stock,
      category: request.userData.slug

      //slug: request.userData.slug,
      //author: products[productIx].author,
      //publisher: products[productIx].publisher,
      //prices: products[productIx].current_variant_price_group,
      //page: request.userData.page,
      //pageUrl: request.url,

      //blackFriday: null
    };

    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      requests.push(
        Apify.pushData(product)
        /*
        uploadToS3(
          s3,
          "luxor.cz",
          await s3FileName(product),
          "jsonld",
          toProduct(product, {})
        )
        */
      );
      crawlContext.stats.items++;
    } else {
      crawlContext.stats.itemsDuplicity++;

      /*
      log.info(
        "Found item duplicity " + product.itemId + ": " + product.itemName
      );
      */
    }
  }

  log.info(
    `Found ${requests.length} unique products, stat.items: ${crawlContext.stats.items} products`
  );
  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);

  /*
  How to request detail if it will be needed
  const requestDetail = {
    url,
    userData: {
      label: LABELS.API_DETAIL,
      product
      //slug: request.userData.slug
    }
  };

  console.log("addRequest DETAIL", requestDetail);

  crawlContext.requestQueue.addRequest(requestDetail);
  */

  // Do next page request

  const pageCount = Math.ceil(productTotalCount / PRODUCTS_PER_PAGE);

  log.info("pageCount " + pageCount);

  log.info(
    "Current product page: " +
      request.userData.page +
      "/" +
      pageCount +
      " on slug " +
      request.userData.slug
  );

  if (request.userData.page * PRODUCTS_PER_PAGE > productTotalCount) {
    log.debug("All pages done with slug " + request.userData.slug);
    return;
  }

  /*
  if (request.userData.page > 5) {
    log.debug("DEBUG BREAK / 5 pages only from " + pageCount);
    return;
  }
  */

  const pageNext = request.userData.page + 1;

  let url = URL_TEMPLATE_PRODUCT_LIST;
  url = url
    .replace(/{PAGE}/g, pageNext)
    .replace(/{PRODUCTS_PER_PAGE}/g, PRODUCTS_PER_PAGE.toString())
    .replace(/{SLUG}/g, request.userData.slug);

  const pageUrl = URL_TEMPLATE_PAGE_URL.replace(
    /{SLUG}/g,
    request.userData.slug
  ).replace(/{PAGE}/g, pageNext);

  const req = {
    url: url,
    userData: {
      label: LABELS.API_LIST,
      page: pageNext,
      pageCount,
      slug: request.userData.slug,
      pageUrl,
      note: "NextPage"
    }
  };

  //console.log("addRequest LIST", req);

  crawlContext.requestQueue.addRequest(req);

  //console.log("DEBUG BREAK / Lists only");
  //return;
};

exports.handleAPIDetail = async (request, crawlContext) => {
  console.log("---\nhandleDetail");

  console.log("PRODUCT", request.product);

  //console.log(products[product].sum_price[0]);
  console.log(request.userData.product.prices);

  const prices = request.userData.product.prices;
  for (const price in prices) {
    console.log(prices[price]);
  }
};

exports.handleFrontStart = async (request, crawlContext) => {
  console.log("---\nhandleFrontStart");

  log.info("Downloading " + URL_FRONT);

  const requestOptions = {
    url: URL_FRONT,
    responseType: "text"
  };

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  const pageNext = 1;

  $(".fqo5ryo")
    .find(".fowumum")
    .each((ix, el) => {
      const url_slug = $(el).attr("href");

      if (url_slug.indexOf("/products") > -1) {
        const req = {
          url: URL_FRONT + url_slug,
          userData: {
            label: LABELS.FRONT_LIST,
            page: pageNext,
            //pageCount,
            slug: url_slug,
            pageUrl
          }
        };

        crawlContext.requestQueue.addRequest(req);
      }
    });
};

exports.handleFrontList = async (request, crawlContext) => {
  console.log("---\nhandleFrontList");
};

exports.handleFrontDetail = async (request, crawlContext) => {
  console.log("---\nhandleFrontDetail");

  const product = {
    itemId: products[productIx].id,
    itemUrl: URL_TEMPLATE_PRODUCT.replace(/{SLUG}/, products[productIx].slug),
    itemName: products[productIx].title,

    currency,
    currentPrice,
    originalPrice,
    discounted: currentPrice < originalPrice,

    img: `${URL_IMAGE_BASE}${imgPath}`,
    inStock: products[productIx].in_stock,
    category: request.userData.slug
  };
};

/**
 * Start sitemap parsing
 * @param context
 * @param crawlContext
 * @returns {Promise<void>}
 */
exports.handleSitemapStart = async (context, crawlContext) => {
  console.log("---\nhandleSitemapStart");

  log.info("Downloading " + URL_SITEMAP);

  const requestOptions = {
    url: URL_SITEMAP,
    responseType: "text"
  };

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  $("sitemap").each((ix, el) => {
    const url = $(el).find("loc").html();
    if (url.indexOf("product") > -1) {
      const req = {
        url,
        userData: {
          label: LABELS.SITEMAP_LIST
        }
      };

      crawlContext.requestQueue.addRequest(req);
    } else {
      console.log("Skipper", url);
    }
  });
};

exports.handleSitemapList = async (context, stats, crawlContext) => {
  const { request } = context;

  const requestOptions = {
    url: request.url,
    responseType: "text"
  };

  // Page counted by pagination
  // 11125*24+913×24+1004×24+957×24+1627×24 = 375024

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  const urls = $("url");
  let productId = [];
  $(urls).each((ix, el) => {
    const productName = $(el).find("loc").html();
    if (!productId.includes(productName)) {
      productId.push(productName);
      stats.items++;
    } else {
      //console.log("itemsDuplicity", productName);
      stats.itemsDuplicity++;
    }
  });

  console.log(`Items count in XML: ${stats.items}`);
};
