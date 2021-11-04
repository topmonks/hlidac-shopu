const Apify = require("apify");
const {
  toProduct,
  uploadToS3
} = require("@hlidac-shopu/actors-common/product.js");
const {
  LABELS,
  SCRIPT_WITH_JSON,
  PRODUCTS_PER_PAGE,
  PRODUCTS_URLS
} = require("./const");

const {
  utils: { log }
} = Apify;

// Create router
const createRouter = globalContext => {
  return async function (routeName, requestContext) {
    const route = module.exports[routeName];
    if (!route) throw new Error(`No route for name: ${routeName}`);
    log.debug(`Invoking route: ${routeName}`);
    return route(requestContext, globalContext);
  };
};

const getProductJSON = async $ => {
  let correctScript;
  const scripts = $("script").toArray();
  for (const s of scripts) {
    const data = s?.children[0]?.data;
    if (data?.startsWith(SCRIPT_WITH_JSON.PREFIX)) {
      correctScript = data;
    }
  }
  if (correctScript) {
    let resultJson = correctScript.replace(SCRIPT_WITH_JSON.PREFIX, "");
    resultJson = resultJson.replace(SCRIPT_WITH_JSON.POSTFIX, "");
    resultJson = resultJson.replaceAll(
      SCRIPT_WITH_JSON.UNDEFINED,
      `"${SCRIPT_WITH_JSON.UNDEFINED}"`
    );
    return resultJson;
  }
};

const getCategory = sections => {
  // create category from the first top down path from the tree
  let result = [];
  let prevParent = "initial";
  for (const section in sections) {
    const item = sections[section];
    if (prevParent === item.parentId || prevParent === "initial") {
      prevParent = item.id;
      result.push(item);
    }
  }
  return result.map(p => p.name.trim()).join(" > ");
};

const START = async ({ $, crawler }) => {
  log.info("Processing START");
  const resultJson = await getProductJSON($);
  const json = JSON.parse(resultJson);
  const totalItems = json.products.listingData.totalItems;
  let totalPages = Math.floor(totalItems / PRODUCTS_PER_PAGE);
  if (global.test) {
    totalPages = 3;
    log.info(`TEST mode. Data are taken only from ${totalPages} pages.`);
  }
  log.info(`Pocet produktu:${totalItems}`);
  log.info(`Pocet stranek produktu:${totalPages}`);
  let baseUrl = PRODUCTS_URLS.PRODUCTS_PAGE;
  if (global.type === LABELS.BF) {
    baseUrl = PRODUCTS_URLS.BF_PRODUCTS_PAGE;
  }
  for (let i = 1; i <= totalPages; i++) {
    await crawler.requestQueue.addRequest({
      url: `${baseUrl}?page=${i}`,
      userData: {
        label: LABELS.PRODUCTS
      }
    });
  }
};

const PRODUCTS = async ({ $ }) => {
  const resultJson = await getProductJSON($);
  const json = JSON.parse(resultJson);
  const products = json.products.listingData.items;

  for (const item of products) {
    const detailImage = item?.images[0]?.detail;
    const originalPrice = parseInt(item?.price?.baseWithVat?.decimal);
    const currentPrice = parseInt(item.price.withVat.decimal);
    const discounted = originalPrice !== currentPrice;
    const category = getCategory(item.sections);
    const result = {
      itemId: item.id.toString().trim(),
      itemCode: item.code,
      itemUrl: `${PRODUCTS_URLS.ITEM_PREFIX}${item.urlRelative}`,
      itemName: item.name,
      img: detailImage,
      discounted,
      originalPrice,
      currency: item.price.withVat.currency,
      currentPrice,
      category
    };
    await uploadToS3(
      s3,
      "prozdravi.cz",
      result.itemId,
      "jsonld",
      toProduct(
        {
          ...result,
          inStock: true
        },
        { priceCurrency: result.currency }
      )
    );
    await Apify.pushData(result);
  }
};

module.exports = {
  createRouter,
  START,
  PRODUCTS
};
