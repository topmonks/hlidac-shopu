/*
// Kategorie produktu
// https://mw.luxor.cz/api/v1/categories?size=100&filter%5BonlyRoot%5D=1
// .data
// obsahuje id (806), title (Knihy), slug (knihy), parent (

// Produkty na stránce
// https://mw.luxor.cz/api/v1/products?page=1&size=24&sort=revenue%3Adesc&filter%5Bcategory%5D=knihy
// .data[0]
// id(393858), author(Karel Gott), in_stock (true), description, title(Má cesta za štěstím),
// current_variant_price_group[0]{with_vat(1399), without_vat(1271.8181), currency(CZK), type(RECOMMENDED, SALE)}

// Subkategorie knih
// https://mw.luxor.cz/api/v1/categories/slug/knihy
// .data.children
// obsahuje id (224), title (Beletrie), slug (knihy-beletrie)
*/

const Apify = require("apify");
const { URL } = require("url");
const { gotScraping } = require("got-scraping");
//const tools = require("./tools");

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

exports.handleStart = async ({ request, requestQueue }) => {
  console.log("---\nhandleStart");

  const { body } = await gotScraping({
    responseType: "json",
    url: URL_TEMPLATE_CATEGORY
  });

  //console.log(body.data);

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

    requestQueue.addRequest(req);

    //log.debug("DEBUG BREAK / 1 category only");
    //break;
  }
};

exports.handleList = async ({ request, requestQueue }) => {
  console.log("---\nhandleList", request);

  const { body } = await gotScraping({
    responseType: "json",
    url: request.url
  });

  const products = body.data;
  const productTotalCount = body.total_count;

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

      img: `${URL_IMAGE_BASE}${imgPath}`,
      inStock: products[productIx].in_stock,
      category: request.userData.slug,
      slug: request.userData.slug,

      author: products[productIx].author,
      publisher: products[productIx].publisher,
      prices: products[productIx].current_variant_price_group,
      page: request.userData.page,
      pageUrl: request.url

      /*
      itemId
      itemCode
      itemUrl
      itemName
      img
      discounted,
      originalPrice
      currency
      currentPrice
      category
      inStock
      blackFriday
      */
    };

    await Apify.pushData(product);
  }

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

  requestQueue.addRequest(requestDetail);
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

  // (page * PRODUCTS_PER_PAGE < productTotalCount)
  if (request.userData.page > 5) {
    log.debug("DEBUG BREAK / 5 pages only from " + pageCount);
    return;
  }

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

  console.log("addRequest LIST", req);

  requestQueue.addRequest(req);

  //console.log("DEBUG BREAK / Lists only");
  //return;
};

exports.handleDetail = async ({ request, requestQueue }) => {
  console.log("---\nhandleDetail");

  console.log("PRODUCT", request.product);
  //request.product.author,
  //request.product.title,
  //request.product.publisher,
  //request.product.slug

  //console.log(products[product].sum_price[0]);
  console.log(request.userData.product.prices);

  const prices = request.userData.product.prices;
  for (const price in prices) {
    console.log(prices[price]);
  }
};
