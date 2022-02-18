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
  PRODUCTS_PER_PAGE
} = require("./const");

// const { s3FileName } = require("@hlidac-shopu/actors-common/product.js");

const {
  utils: { log }
} = Apify;

exports.handleStart = async (context, crawlContext) => {
  console.log("---\nhandleStart");

  const requestOptions = {
    url: URL_TEMPLATE_CATEGORY,
    responseType: "json"
  };
  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }
  const { body } = await gotScraping(requestOptions);

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
        label: "LIST",
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

exports.handleList = async (context, crawlContext) => {
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

      /*
      itemId*
      itemUrl*
      itemName*
      img*
      discounted,*
      originalPrice
      currency
      currentPrice
      category
      inStock  true
      */
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
    }
  }

  log.info(
    `Found ${requests.length} unique products, stat.items: ${crawlContext.stats.items} products`
  );
  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);

  /*
  How to request detail if will be needed
  const requestDetail = {
    url,
    userData: {
      label: "DETAIL",
      product
      //slug: request.userData.slug
    }
  };

  console.log("addRequest DETAIL", requestDetail);

  crawlContext.requestQueue.addRequest(requestDetail);
  */

  // Do next page request

  const pageCount = Math.ceil(productTotalCount / PRODUCTS_PER_PAGE);

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

  const pageUrl = URL_TEMPLATE_PAGE_URL.replace(/{PAGE}/g, pageNext);

  const req = {
    url: url,
    userData: {
      label: "LIST",
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

exports.handleDetail = async (request, crawlContext) => {
  console.log("---\nhandleDetail");

  console.log("PRODUCT", request.product);

  //console.log(products[product].sum_price[0]);
  console.log(request.userData.product.prices);

  const prices = request.userData.product.prices;
  for (const price in prices) {
    console.log(prices[price]);
  }
};
