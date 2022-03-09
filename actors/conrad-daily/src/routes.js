const Apify = require("apify");
//const { URL } = require("url");
const { gotScraping } = require("got-scraping");
//const tools = require("./tools");
const processedIds = new Set();
const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToS3v2 } = require("@hlidac-shopu/actors-common/product.js");

const {
  URL_TEMPLATE_PRODUCT_LIST,
  URL_TEMPLATE_CATEGORY,
  URL_TEMPLATE_PRODUCT,
  URL_TEMPLATE_PAGE_URL,
  URL_IMAGE_BASE,
  URL_SITEMAP,
  PRODUCTS_PER_PAGE,
  LABELS,
  URL_FRONT,
  URL_API_START
} = require("./const");
const cheerio = require("cheerio");

const {
  utils: { log }
} = Apify;

function traverseCategory(category) {
  console.log("Category URL", category.url);

  /*
  if (category.hasOwnProperty("children")) {
    for (let childIx in category.children) {
      console.log("Child", category.children[childIx]);
      traverseCategory(category.children[childIx]);
    }
  }
  */
}

async function getApiKey() {
  const requestOptions = {
    url: URL_API_START
  };

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body);

  const globals = $("script#globals").html();

  const matchX = globals.match(/apiKey: '(.*)',/);

  if (matchX) {
    return matchX[1];
  } else {
    return false;
  }
}

async function traverseCategoryStart(crawlContext) {
  const requestOptions = {
    url: URL_TEMPLATE_CATEGORY,
    responseType: "json"
  };

  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }

  crawlContext.stats.requests++;

  const { body } = await gotScraping(requestOptions);
  const categories = body.body;

  //console.log(categories);

  for (let categoryIx in categories) {
    //console.log(categories[category]);

    traverseCategory(categories[categoryIx]);
  }
}

exports.handleAPIStart = async (context, crawlContext) => {
  const apiKey = await getApiKey();
  if (!apiKey) {
    log.error("Cannot found apiKey");
    return;
  }

  console.log(`apiKey ${apiKey}`);

  //traverseCategoryStart(crawlContext);

  const requestOptions = {
    url: URL_TEMPLATE_PRODUCT_LIST.replace("{APIKEY}", apiKey),
    responseType: "json"
  };

  if (!crawlContext.development) {
    requestOptions.proxyUrl = crawlContext.proxyConfiguration.newUrl();
  }

  crawlContext.stats.requests++;

  const { body } = await gotScraping.post(requestOptions, {
    json: {
      "facetFilter": [],
      "from": 0,
      "globalFilter": [
        {
          "field": "categoryId",
          "type": "TERM_OR",
          "values": ["0203060"]
        }
      ],
      "query": "",
      "size": 30,
      "sort": [
        {
          "field": "price",
          "order": "asc"
        }
      ],
      "disabledFeatures": ["FIRST_LEVEL_CATEGORIES_ONLY"],
      "enabledFeatures": ["and_filters"]
    }
  });

  console.log(body.hits);

  /*

  // First page for all categories
  const PAGE = 1;

  for (const category in categories) {
    const slug = categories[category].slug;

    log.debug(slug);

    crawlContext.stats.categories++;

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
  }

   */
};

exports.handleAPIList = async (context, crawlContext) => {
  const { request } = context;
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
      requests.push(Apify.pushData(product), uploadToS3v2(s3, product));
      crawlContext.stats.items++;
    } else {
      crawlContext.stats.itemsDuplicity++;
    }
  }

  log.info(
    `Found ${requests.length / 2} unique products, overall: ${
      crawlContext.stats.items
    } products,` +
      ` ${crawlContext.stats.itemsDuplicity} duplicits, ${crawlContext.stats.failed} failed,` +
      ` ${crawlContext.stats.categories} categories`
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

  crawlContext.requestQueue.addRequest(req);
};

exports.handleAPIDetail = async (request, crawlContext) => {
  console.log("PRODUCT", request.product);

  //console.log(products[product].sum_price[0]);
  console.log(request.userData.product.prices);

  const prices = request.userData.product.prices;
  for (const price in prices) {
    console.log(prices[price]);
  }
};

exports.handleFrontStart = async (request, crawlContext) => {
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

exports.handleSitemapList = async (context, crawlContext) => {
  const { request } = context;

  const requestOptions = {
    url: request.url,
    responseType: "text"
  };

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  const urls = $("url");
  let productId = [];
  $(urls).each((ix, el) => {
    const productName = $(el).find("loc").html();
    if (!productId.includes(productName)) {
      productId.push(productName);
      crawlContext.stats.items++;
    } else {
      //console.log("itemsDuplicity", productName);
      crawlContext.stats.itemsDuplicity++;
    }
  });

  console.log(`Items count in XML: ${crawlContext.stats.items}`);
};
