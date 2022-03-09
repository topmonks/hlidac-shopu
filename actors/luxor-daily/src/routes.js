import Apify from "apify";
import { gotScraping } from "got-scraping";
import { S3Client } from "@aws-sdk/client-s3";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";
import {
  LABELS,
  PRODUCTS_PER_PAGE,
  URL_FRONT,
  URL_IMAGE_BASE,
  URL_SITEMAP,
  URL_TEMPLATE_CATEGORY
} from "./const";
import cheerio from "cheerio";

const s3 = new S3Client({ region: "eu-central-1" });
const {
  utils: { log }
} = Apify;

export async function handleAPIStart(context, crawlContext) {
  const requestOptions = {
    url: URL_TEMPLATE_CATEGORY,
    proxyUrl: crawlContext.proxyConfiguration.newUrl(),
    responseType: "json"
  };
  const { body } = await gotScraping(requestOptions);

  crawlContext.stats.requests++;

  const categories = body.data;

  // First page for all categories
  const PAGE = 1;

  for (const category in categories) {
    const slug = categories[category].slug;

    log.debug(slug);

    crawlContext.stats.categories++;

    const req = {
      url: `https://mw.luxor.cz/api/v1/products?page=${PAGE}&size=${PRODUCTS_PER_PAGE}&sort=revenue%3Adesc&filter%5Bcategory%5D=${slug}`,
      userData: {
        label: LABELS.API_LIST,
        slug: slug,
        page: 1
      }
    };
    console.log("addRequest LIST / first page", req);

    crawlContext.requestQueue.addRequest(req);
  }
}

export async function handleAPIList(context, crawlContext) {
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
      itemUrl: `https://luxor.cz/product/${products[productIx].slug}`,
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

    if (!crawlContext.processedIds.has(product.itemId)) {
      crawlContext.processedIds.add(product.itemId);
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

  const req = {
    url: `https://mw.luxor.cz/api/v1/products?page=${pageNext}&size=${PRODUCTS_PER_PAGE}&sort=revenue%3Adesc&filter%5Bcategory%5D=${request.userData.slug}`,
    userData: {
      label: LABELS.API_LIST,
      page: pageNext,
      pageCount,
      slug: request.userData.slug,
      pageUrl: `https://luxor.cz/products/${request.userData.slug}?page=${pageNext}`,
      note: "NextPage"
    }
  };

  crawlContext.requestQueue.addRequest(req);
}

export async function handleAPIDetail(request, crawlContext) {
  console.log("PRODUCT", request.product);

  //console.log(products[product].sum_price[0]);
  console.log(request.userData.product.prices);

  const prices = request.userData.product.prices;
  for (const price in prices) {
    console.log(prices[price]);
  }
}

export async function handleFrontStart(request, crawlContext) {
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
}

export async function handleFrontList(request, crawlContext) {
  console.log("---\nhandleFrontList");
}

export async function handleFrontDetail(request, crawlContext) {
  console.log("---\nhandleFrontDetail");

  const product = {
    itemId: products[productIx].id,
    itemUrl: `https://luxor.cz/product/${products[productIx].slug}`,
    itemName: products[productIx].title,

    currency,
    currentPrice,
    originalPrice,
    discounted: currentPrice < originalPrice,

    img: `${URL_IMAGE_BASE}${imgPath}`,
    inStock: products[productIx].in_stock,
    category: request.userData.slug
  };
}

/**
 * Start sitemap parsing
 * @param context
 * @param crawlContext
 * @returns {Promise<void>}
 */
export async function handleSitemapStart(context, crawlContext) {
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
}

export async function handleSitemapList(context, crawlContext) {
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
}
