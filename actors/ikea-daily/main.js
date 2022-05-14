import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  uploadToS3v2,
  invalidateCDN
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import cheerio from "cheerio";

const {
  utils: { log, requestAsBrowser }
} = Apify;

function getCategoryRequests($) {
  const categories = [];
  $("loc").each((index, locElement) => {
    categories.push({
      url: $(locElement).html(),
      userData: {
        label: "CATEGORY"
      }
    });
  });
  return categories;
}

function siteMapToLinks(data) {
  const locs = data.replace(/\s+/g, "").match(/(<loc>)(.*?)(<\/loc>)/g);
  if (locs) {
    return locs.map(link => link.replace(/<loc>|<\/loc>/g, ""));
  }
  return [];
}

/**
 * Gets urls of subcategories on category labeled page, if any.
 * @param $
 * @returns {String[]}
 */
function getSubcategoriesUrls($) {
  const subcategories = [];
  $("nav[role='navigation'] a").each((index, link) => {
    const subcategory = $(link).attr("href");
    if (subcategory != null) {
      subcategories.push(subcategory);
    }
  });
  return subcategories;
}

/**
 * Models and fills productData object.
 * @param product product object returned by previous request
 * @param numberOfVariants number of available product variants
 * @returns {Product}
 */
function fillProductData(product, numberOfVariants) {
  return {
    itemName: `${product.name}: ${product.typeName}`,
    itemUrl: product.pipUrl,
    currentPrice: parseFloat(product.priceNumeral),
    originalPrice: null,
    discounted: false,
    productTypeName: product.typeName,
    // number of products in stock is different
    // for individual shopping places
    inStock: true,
    // if the product is a variant, use variantId else use productId
    itemId:
      numberOfVariants !== 0
        ? product.id.replace("s", "")
        : product.itemNoGlobal,
    // description: '',
    img: product.mainImageUrl,
    sale: 0
  };
}

/**
 * Gets product's price from detail page.
 * @param $
 * @returns {number|boolean}
 */
function getPrice($) {
  let $mainPrice = $(".pip-pip-price-package__main-price");
  const integer = $mainPrice
    .find(".pip-price__integer")
    .eq(0)
    .text()
    .replace(/\s/, "");
  const decimals = $mainPrice
    .find(".pip-price__decimals")
    .eq(0)
    .clone() // clone the element
    .children() // select all the children
    .remove() // remove all the children
    .end() // again go back to selected element
    .text()
    .replace(/\s/, "");
  if (integer && decimals) {
    return parseFloat(`${integer}.${decimals}`);
  }
  if (integer) {
    return parseFloat(integer);
  }
  return false;
}

/**
 * Gets product's variant name from detail page.
 * @param $
 * @param productTypeName {string}
 * @returns {string|null}
 */
function getVariantName($, productTypeName) {
  let name = "";
  const spans = $(".pip-header-section")
    .find(".pip-header-section__description")
    .eq(0)
    .find("span");
  spans.each((index, span) => {
    name += `${$(span).text()}`;
    if (index !== spans.length - 1) {
      name += ", ";
    }
  });

  return name.substr(productTypeName?.length + 2);
}

/**
 * Tries to get product's price before sale.
 * @param $
 * @returns {number|boolean}
 */
function tryGetRetailPrice($) {
  // retail price if the item is in sale (strike through)
  let $previousPrice = $(
    `.pip-pip-price-package__previous-price-hasStrikeThrough,
    .pip-pip-price-package__previous-price`
  );
  let integer = $previousPrice
    .find(".pip-price__integer")
    .eq(0)
    .text()
    .replace(/\s/, "");
  let decimals = $previousPrice
    .find(".pip-price__decimals")
    .eq(0)
    .clone() // clone the element
    .children() // select all the children
    .remove() // remove all the children
    .end() // again go back to selected element
    .text()
    .replace(/\s/, "");
  if (integer && decimals) {
    return parseFloat(`${integer}.${decimals}`);
  }
  if (integer) {
    return parseInt(integer, 10);
  }
  return false;
}

/**
 * Gets number of reviews and review score from product's detail page.
 * @param $
 * @returns {{reviewScore: string, numberOfReviews: number}}
 */
function getReview($) {
  const review = {
    numberOfReviews: 0,
    reviewScore: ""
  };
  const reviewButton = $(".pip-average-rating__button");
  if (reviewButton.eq(0).html() === null) {
    // if there is no review of the product yet
    return review;
  }
  // review score
  review.reviewScore = reviewButton
    .eq(0)
    .attr("aria-label")
    .match(/[0-9]\.?[0-9]?/)[0];
  // number of reviews
  review.numberOfReviews = reviewButton
    .find(".pip-average-rating__reviews")
    .eq(0)
    .text()
    .match(/[0-9]+/)[0];
  return review;
}

/**
 * Returns the category path to a product as an array of strings.
 * Starts from the most general category.
 * @param $
 * @returns {String[]}
 */
function getProductDetailCategories($) {
  const categories = [];
  $(".bc-breadcrumb__list-item")
    .find("span")
    .each((index, category) => {
      categories.push($(category).text());
    });
  // the last category is the name of the product
  categories.pop();
  return categories;
}

async function handleSitemap({ body, crawler }, { stats }) {
  const links = siteMapToLinks(body);
  stats.categories += links.length;
  for (const url of links) {
    await crawler.requestQueue.addRequest({
      url,
      userData: {
        label: "CATEGORY"
      }
    });
  }
}

async function handleCategory({ request, $, crawler }, countryPath, type) {
  // If category contains subcategories then don't add it to requestQueue
  // subcategories were already added in request queue
  const subcategories = getSubcategoriesUrls($);
  log.info(
    `[CATEGORY]: found ${subcategories.length} subcategories --- ${request.url}`
  );
  if (subcategories.length === 0) {
    try {
      const dataCategory = JSON.parse(
        $(".js-product-list").eq(0).attr("data-category")
      );
      log.info(
        `[CATEGORY]: found ${dataCategory.totalCount} products --- ${request.url}`
      );
      if (type === "DAILY") {
        await crawler.requestQueue.addRequest({
          url:
            `https://sik.search.blue.cdtapps.com/${countryPath}/product-list-page/more-products?category=${dataCategory.id}` +
            `&sort=RELEVANCE&start=0&end=${dataCategory.totalCount}&c=lf`,
          userData: {
            label: "LIST"
          }
        });
      } else if (type === "COUNT") {
        return parseInt(dataCategory.totalCount, 10);
      }
    } catch (e) {
      log.info(
        `[CATEGORY]: Category does not contain any products --- ${request.url}`
      );
      if (type === "COUNT") {
        return 0;
      }
    }
  }
  if (type === "COUNT") {
    return 0;
  }
}

async function handleList({ request, body, crawler }) {
  let products = [];
  try {
    products = JSON.parse(body).moreProducts.productWindow;
    log.info(
      `[LIST]: ready to scrape ${products.length} products --- ${request.url}`
    );
  } catch (e) {
    log.info(
      `[LIST]: ${JSON.parse(body).reason}, removing from scraped pages --- ${
        request.url
      }`
    );
  }
  for (const product of products) {
    const productVariants = product.gprDescription.variants;
    const productData = fillProductData(product, productVariants.length);
    // add product detail to request queue
    await crawler.requestQueue.addRequest({
      url: product.pipUrl,
      userData: {
        label: "DETAIL",
        productData
      }
    });
    // handle product variants
    for (const variant of productVariants) {
      productData.itemId = variant.itemNoGlobal;
      productData.itemUrl = variant.pipUrl;
      productData.variantName = variant.imageAlt.substr(
        variant.imageAlt.indexOf(productData.productTypeName) +
          productData.productTypeName.length +
          2
      );
      await crawler.requestQueue.addRequest({
        url: variant.pipUrl,
        userData: {
          label: "DETAIL",
          productData
        }
      });
    }
  }
}

async function handleDetail({ $ }, { productData, s3, stats }) {
  productData.currentPrice = getPrice($) || productData.currentPrice;
  productData.originalPrice = tryGetRetailPrice($) || null;
  if (
    productData.originalPrice &&
    productData.currentPrice < productData.originalPrice
  ) {
    productData.discounted = true;
    productData.sale = Math.round(
      ((productData.originalPrice - productData.currentPrice) /
        productData.originalPrice) *
        100
    );
  }

  if (!productData.variantName) {
    productData.variantName =
      getVariantName($, productData.productTypeName) || "";
  }
  if (productData.variantName) {
    productData.itemName += ` - ${productData.variantName}`;
  }
  delete productData.variantName;
  delete productData.productTypeName;

  productData.currency = $("div[data-currency]").eq(0).attr("data-currency");

  // productData.description = $("p[class='pip-product-summary__description']").eq(0).text();
  const review = getReview($);
  productData.rating = review.reviewScore;
  productData.numberOfReviews = review.numberOfReviews;

  const categories = getProductDetailCategories($);
  productData = {
    ...productData,
    category: categories
  };
  stats.items++;

  await Promise.allSettled([
    Apify.pushData(productData),
    uploadToS3v2(s3, productData, {
      priceCurrency: productData.currency,
      inStock: true
    })
  ]);
}

Apify.main(async function main() {
  rollbar.init();
  const input = await Apify.getInput();
  const {
    development = false,
    test = false,
    maxRequestRetries = 3,
    maxConcurrency = 100,
    country = "cz",
    proxyGroups = ["CZECH_LUMINATI"],
    type = "DAILY"
  } = input ?? {};

  const stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    items: 0
  };
  let productCount = 0;

  // sitemap available here: https://www.ikea.com/sitemaps/sitemap.xml
  let sitemap = "https://www.ikea.com/sitemaps/cat-cs-CZ_1.xml";
  let countryPath = "cz/cs";
  switch (country) {
    case "cz":
      sitemap = "https://www.ikea.com/sitemaps/cat-cs-CZ_1.xml";
      countryPath = "cz/cs";
      break;
    case "sk":
      sitemap = "https://www.ikea.com/sitemaps/cat-sk-SK_1.xml";
      countryPath = "sk/sk";
      break;
    case "hu":
      sitemap = "https://www.ikea.com/sitemaps/cat-hu-HU_1.xml";
      countryPath = "hu/hu";
      break;
    case "pl":
      sitemap = "https://www.ikea.com/sitemaps/cat-pl-PL_1.xml";
      countryPath = "pl/pl";
      break;
    case "de":
      sitemap = "https://www.ikea.com/sitemaps/cat-de-DE_1.xml";
      countryPath = "de/de";
      break;
    case "at":
      sitemap = "https://www.ikea.com/sitemaps/cat-de-AT_1.xml";
      countryPath = "at/de";
      break;
    default:
      throw new Error(`The scraper does not support ${country} country`);
  }

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });

  const requestQueue = await Apify.openRequestQueue();

  if (development && test) {
    await requestQueue.addRequest({
      url: "https://www.ikea.com/cz/cs/cat/rozkladaci-sedaci-soupravy-20874/",
      userData: {
        label: "CATEGORY"
      }
    });
  } else if (type === "DAILY") {
    await requestQueue.addRequest({
      url: sitemap,
      userData: {
        label: "SITEMAP"
      }
    });
  } else if (type === "COUNT") {
    productCount = (await Apify.getValue("COUNT")) || 0;
    Apify.events.on("migrating", () => {
      Apify.setValue("COUNT", productCount)
        .then(() => log.info("[PRODUCT COUNT] Saved"))
        .catch(error => {
          log.error(`[ERROR]: ${error.message.toString()}`);
        });
    });

    setInterval(async () => {
      log.info(`[PRODUCT COUNT] ${productCount}`);
      await Apify.setValue("COUNT", productCount);
    }, 20 * 1000);

    // Categories are added to requestQueue
    const { retry } = await import("@hlidac-shopu/lib/remoting.mjs");
    const categoryRequests = await retry(10, async () => {
      // if anything throws, we retry
      const response = await requestAsBrowser({
        url: sitemap,
        proxyUrl: proxyConfiguration.newUrl()
      });
      const $ = cheerio.load(response.body);
      const categories = getCategoryRequests($);
      log.info(`[START]: found ${categories.length} categories --- ${sitemap}`);
      return categories;
    });

    for (const item of categoryRequests) {
      await requestQueue.addRequest(item);
    }
  }

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency,
    maxRequestRetries,
    handlePageTimeoutSecs: 240,
    requestTimeoutSecs: 180,
    async handlePageFunction(context) {
      const {
        url,
        userData: { label, productData }
      } = context.request;
      log.info("Page opened.", { label, url });
      switch (label) {
        case "SITEMAP":
          return handleSitemap(context, { stats });
        case "CATEGORY":
          const handleCategoryResult = await handleCategory(
            context,
            countryPath,
            type
          );
          if (type === "DAILY") {
            return handleCategoryResult;
          } else if (type === "COUNT") {
            productCount += handleCategoryResult;
          }
          return;
        case "LIST":
          return handleList(context);
        case "DETAIL":
          return handleDetail(context, { productData, s3, stats });
        default:
          throw new Error(`No route for label: ${label}`);
      }
    }
  });

  log.info("Starting the crawl.");
  await crawler.run();
  log.info("Crawl finished.");

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (!development) {
    if (type === "DAILY") {
      await invalidateCDN(
        cloudfront,
        "EQYSHWUECAQC9",
        `ikea.${country.toLowerCase()}`
      );
      log.info("invalidated Data CDN");

      await uploadToKeboola(`ikea_${country.toLowerCase()}`);
    } else if (type === "COUNT") {
      await Apify.pushData({ numberOfProducts: productCount });
    }
  }

  log.info("Finished.");
});
