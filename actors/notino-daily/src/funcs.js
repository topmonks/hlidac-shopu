const Apify = require("apify");
const {
  DETAIL_PAGE,
  CATEGORY_PAGE,
  HOME_PAGE,
  BASE_URL,
  BASE_URL_SK,
  BF,
  COUNTRY
} = require("./consts");
const { getReviews } = require("./reviewParser");

const { log } = Apify.utils;

const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");

const processedIds = new Set();
async function pushProducts(products, country, stats) {
  const requests = [];
  let count = 0;
  // we don't need to block pushes, we will await them all at the end
  for (const product of products) {
    if (!processedIds.has(product.itemId)) {
      const fileName = await s3FileName(product);
      processedIds.add(product.itemId);
      // push data to dataset to be ready for upload to Keboola
      requests.push(
        Apify.pushData(product),
        // upload JSON+LD data to CDN
        uploadToS3(
          s3,
          `notino.${country.toLowerCase()}`,
          fileName,
          "jsonld",
          toProduct(product, {})
        )
      );
      count += 1;
    } else {
      stats.itemsDuplicity += 1;
    }
  }
  stats.items += count;
  await Promise.all(requests);
}

/**
 *
 * @param {Cheerio} $
 * @property {Function} exists
 * @returns {Cheerio}
 */
function extendCheerio($) {
  $.prototype.exists = function () {
    return this.length > 0;
  };
  return $;
}
/**
 *
 * @param {Cheerio} $
 */
function getScriptContent($) {
  let content;
  const state = $("#__APOLLO_STATE__");
  if (state.length !== 0) {
    content = state.html();
  }
  return content;
}

const dig = (o, ...args) => {
  return args.reduce((xs, x) => (xs && xs[x] ? xs[x] : null), o);
};

const getRootUrl = input => {
  return !input.country || input.country === COUNTRY.CZ
    ? BASE_URL
    : BASE_URL_SK;
};

const handleHomePage = async (requestQueue, request, $, input, stats) => {
  log.debug("Home page");
  const jsonMainMenu = $('script[id="main-menu-state"]').html();
  const mainMenu = JSON.parse(jsonMainMenu);
  const rootUrl = getRootUrl(input);
  let links = [];
  if (mainMenu) {
    const categories = dig(
      mainMenu,
      "fragmentContextData",
      "DataProvider",
      "categories"
    );
    for (const category of categories) {
      if (category.columns.length > 0) {
        for (const column of category.columns) {
          for (const subCat of column.subCategories) {
            if (subCat.isLink) {
              links.push({
                url: `${rootUrl}${subCat.link}`,
                userData: {
                  label: CATEGORY_PAGE
                }
              });
            }
            for (const pt of subCat.productTypes) {
              links.push({
                url: `${rootUrl}${pt.link}`,
                userData: {
                  label: CATEGORY_PAGE
                }
              });
            }
          }
        }
      } else {
        links.push({
          url: `${rootUrl}${category.link}`,
          userData: {
            label: CATEGORY_PAGE
          }
        });
      }
    }
  }
  log.info(`Found categories ${links.length}`);
  if (links.length === 0) {
    await Apify.setValue("empty-categories", $("body").html());
    throw "empty categories";
  }
  if (input && input.development) {
    links = links.slice(0, 1);
    log.info("Development mode, find products only in 1 category.");
  }
  stats.categories = links.length;
  stats.pages += links.length;
  // eslint-disable-next-line no-return-await
  await links.forEach(async l => await requestQueue.addRequest(l));
};

/**
 *
 * @param {cheerio} $
 * @returns {{nextPages: Array, currentPage: number}}
 */
const getCategoryPages = $ => {
  const paging = $(".paging .pages").first();
  const pages = {
    currentPage: parseInt(paging.find("strong").text(), 10),
    nextPages: []
  };
  const aLotOfPages = paging.find(".dots").get().length > 0;
  const $nextPages = paging.find("a");

  const nextPagesLength = $nextPages.get().length;
  if (nextPagesLength === 0) return pages;

  // remove first (Previous) and last (Next) elements,
  // then extract all pages urls
  if (aLotOfPages) {
    const first = parseInt($($nextPages.get(1)).text(), 10);
    const last = parseInt($($nextPages.get(nextPagesLength - 2)).text(), 10);
    const urlExample = $($nextPages.get(1)).attr("href");
    if (pages.currentPage === 1)
      log.debug(
        `a lot of pages in this category: ${first} => ${last}; ${urlExample}`
      );
    for (let i = first; i < last; i++) {
      pages.nextPages.push({
        id: i,
        url: urlExample.replace(/\?f=(\d*)-/g, `?f=${i}-`)
      });
    }
  } else {
    $nextPages.slice(1, nextPagesLength - 1).each((index, a) => {
      pages.nextPages.push({ id: index + 1, url: $(a).attr("href") });
    });
  }

  return pages;
};

const handleCategoryPage = async (requestQueue, request, $, input, stats) => {
  log.debug("Processing products in category page");
  const categoryPages = getCategoryPages($);
  log.debug(`current page: ${categoryPages.currentPage}`);
  if (categoryPages.currentPage === 1) {
    log.debug(`total pages number: ${categoryPages.nextPages.length + 1}`);
    for (const nextPage of categoryPages.nextPages) {
      await requestQueue.addRequest({
        url: nextPage.url,
        userData: { label: CATEGORY_PAGE }
      });
      stats.pages += 1;
    }
  }
  const productsUrls = $("#productsList li a")
    .map((i, el) => $(el).attr("href"))
    .get();
  log.debug(
    `${productsUrls.length} products found on page number ${categoryPages.currentPage}`
  );
  // if ((await inputPromise).testMode) {
  //     return;
  // }

  //  const rootUrl = input.country === COUNTRY.CZ ? BASE_URL : BASE_URL_SK;
  const rootUrl = getRootUrl(input);
  for (let productUrl of productsUrls) {
    productUrl =
      productUrl.search(/notino\.[cz|sk]/) < 0
        ? `${rootUrl}${productUrl}`
        : productUrl;
    //    stats.items++;
    stats.pages++;
    await requestQueue.addRequest(
      {
        url: productUrl,
        userData: { label: DETAIL_PAGE }
      },
      { forefront: true }
    );
  }
  stats.categoriesDone++;
};

/**
 * Check if debug mode is active
 * @return {boolean}
 */
function isDebugMode() {
  return log.getLevel() === log.LEVELS.DEBUG;
}

/**
 *
 * @param requestQueue
 * @param request
 * @param {CheerioSelector} $
 * @param {Array} input
 * @return {Promise<void>}
 */
const handleProductInDetailPage = async (
  requestQueue,
  request,
  $,
  session,
  response,
  input,
  proxyConfiguration,
  stats
) => {
  const results = [];
  async function handleProductUsingWindowObject() {
    log.debug("Handled by windowObject");
    const dataStringFromScriptTag = await getScriptContent(
      $,
      /id="__APOLLO_STATE__"/g
    );
    // await Apify.setValue(`${Math.random()}_debug`, dataStringFromScriptTag, { contentType: 'text/html' });
    if (dataStringFromScriptTag === undefined) {
      log.error(
        "We can't scrape product using this method: handleProductUsingWindowObject"
      );
      return;
    }
    const mainImage = $("#pd-image-main");
    const productData = JSON.parse(dataStringFromScriptTag.replace(/;/g, ""));
    let productGeneralData = Object.entries(productData).find(
      entry =>
        productData.hasOwnProperty(entry[0]) &&
        /^Product:\{"id":"\d+"\}$/.test(entry[0]) &&
        entry[1] &&
        entry[1].category
    );
    productGeneralData = (productGeneralData || ["", {}])[1];

    const variants = [];
    for (const key in productData) {
      if (productData.hasOwnProperty(key) && /^Variant:\d+$/.test(key)) {
        variants.push(Number.parseInt(key.replace("Variant:", ""), 10));
      }
    }
    let category = [];
    // if (productGeneralData.category && productGeneralData.subCategory) {
    //   category = [...productGeneralData.category, ...productGeneralData.subCategory].join('/')
    // }
    ["category", "subCategory", "type"].forEach(key => {
      if (productGeneralData.hasOwnProperty(key)) {
        category.push(productGeneralData[key].join("/"));
      }
    });
    category = category.join("/");

    const rootUrl = getRootUrl(input);

    for (const variant of variants) {
      const variantGeneralData = productData[`Variant:${variant}`];
      /* eslint no-continue: off */
      if (!variantGeneralData.canBuy) continue;
      const productName = `${productGeneralData.brand} ${
        variantGeneralData.name ? variantGeneralData.name : ""
      } ${
        variantGeneralData.variantName ? variantGeneralData.variantName : ""
      } ${
        variantGeneralData.additionalInfo
          ? variantGeneralData.additionalInfo
          : ""
      }`;
      const product = {
        itemId: `${variantGeneralData.id}`,
        itemUrl: `${rootUrl}${variantGeneralData.url}`,
        itemName: productName.trimRight(),
        discounted: false,
        currentPrice: null,
        originalPrice: null,
        variantCount: variants.length
      };
      if (mainImage.length !== 0) {
        product.img = mainImage.attr("src");
      }
      if (category.length > 0) {
        product.category = category;
      }
      const currentPrice = variantGeneralData.price.value; //productData[variantGeneralData.price.id].value;
      const originalPrice =
        variantGeneralData.originalPrice !== null
          ? variantGeneralData.originalPrice.value // productData[variantGeneralData.originalPrice.id].value
          : null;
      product.discounted =
        originalPrice !== null ? currentPrice < originalPrice : false;
      product.currentPrice = currentPrice;
      product.originalPrice = product.discounted ? originalPrice : null;

      if (isDebugMode()) product["#debug"] = { productData };
      if (product.currentPrice === null) {
        product.currentPrice = "Price not defined.";
      }
      results.push(product);
      global.crawledProducts++;
    }
  }
  async function handleProductUsingHTML() {
    log.debug("Handled by HTML");
    if (!$('a[href="#variants"]').exists()) {
      log.error(
        "We can't scrape product using this method: handleProductUsingHTML"
      );
      return;
    }
    const mainImage = $("#pd-image-main");
    const variantsWrapper = $("#variants");
    const variants = variantsWrapper.find("li").get();

    for (const variant of variants) {
      const product = {
        itemId: `${$(variant).find('input[name="nComID"]').attr("value")}`,
        itemUrl: `${request.url}`,
        itemName: `${$(variant).find('input[name="NameItem"]').attr("value")}`,
        discounted: false,
        currentPrice: 0,
        originalPrice: null,
        variantCount: variants.length
      };

      if (mainImage.length !== 0) {
        product.img = mainImage.attr("src");
      }
      const currentPrice = Number.parseInt(
        $(variant).find('input[name="price"]').attr("value"),
        10
      );
      const originalPrice = $(variant).find(".price span span strong").exists()
        ? Number.parseInt($(variant).find(".price span span strong").text(), 10)
        : null;
      product.discounted =
        originalPrice !== null ? currentPrice < originalPrice : false;
      product.currentPrice = currentPrice;
      product.originalPrice = product.discounted ? originalPrice : null;

      if (isDebugMode()) product["#debugData"] = {};
      if (product.currentPrice === null) {
        product.currentPrice = "Price not defined.";
      }
      results.push(product);
      global.crawledProducts++;
    }
  }
  if ($.html().includes('id="__APOLLO_STATE__"')) {
    await handleProductUsingWindowObject();
  } else if ($('a[href="#variants"]').exists()) {
    await handleProductUsingHTML();
  }
  const country = input.country ?? COUNTRY.CZ;
  if (input.type === "CZECHITAS") {
    // solve reviews
    log.info(`Grab reviews for ${request.url}`);
    // eslint-disable-next-line max-len
    const jsonData =
      $('main>script[type="application/ld+json"]').length !== 0
        ? JSON.parse($('main>script[type="application/ld+json"]').html())
        : null;
    const token =
      $('input[name="userJwtToken"]').length !== 0
        ? $('input[name="userJwtToken"]').val()
        : null;
    if (jsonData.offers && jsonData.offers.length !== 0) {
      const variantList = [];
      for (const variant of results) {
        for (const item of jsonData.offers) {
          if (`https://www.notino.cz${item.url}` === variant.itemUrl) {
            log.info(
              `Match https://www.notino.cz${item.url}, ${variant.itemUrl}`
            );
            variant.sku = item.sku;
            const { sku } = item;
            variant.reviews = await getReviews({
              sku,
              token,
              session,
              proxyConfiguration
            });
            //            await Apify.pushData(variant);
            variantList.push(variant);
          } else {
            log.info(
              `NO Match https://www.notino.cz${item.url}, ${variant.itemUrl}`
            );
          }
        }
      }
      await pushProducts(variantList, country, stats);
    }
  } else {
    await pushProducts(results, country, stats);
  }
};

const handlePageFunction = async (
  requestQueue,
  request,
  $,
  session,
  response,
  input,
  proxyConfiguration,
  stats
) => {
  //  log.info(`Page url ${request.url}, stats ${JSON.stringify(stats)}`);
  const { statusCode } = response;
  if (![404, 200].includes(statusCode)) {
    session.retire();
    request.retryCount--;
    await Apify.utils.sleep(5000);
    throw new Error("Blocked.");
  }
  switch (request.userData.label) {
    case HOME_PAGE: {
      await handleHomePage(requestQueue, request, $, input, stats);
      break;
    }
    case BF:
    case CATEGORY_PAGE:
      await handleCategoryPage(requestQueue, request, $, input, stats);
      break;
    case DETAIL_PAGE: {
      await handleProductInDetailPage(
        requestQueue,
        request,
        $,
        session,
        response,
        input,
        proxyConfiguration,
        stats
      );
      break;
    }
    default:
  }
};

const handleFailedRequestFunction = async ({ request }) => {
  log.error(`Request ${request.url} failed too many times`);
  await Apify.pushData({
    "#debug": Apify.utils.createRequestDebugInfo(request)
  });
};

module.exports = {
  handlePageFunction,
  handleFailedRequestFunction,
  extendCheerio
};
