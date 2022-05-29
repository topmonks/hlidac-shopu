import Apify from "apify";
import cheerio from "cheerio";
import { gotScraping } from "got-scraping";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";

const {
  utils: { log, requestAsBrowser }
} = Apify;

const urlBase = "https://www.electroworld.cz";

const mainBodyToken = "#snippet--pdbox";

const productItemToken = "div.product-list section.product-box";
const categoryToken = ".subcategories section";
const pagingToken = ".pagination .page-item";

const productRatingToken = "p.product-box__rating span.sr-only";
const productNameToken = ".product-box__link";
const productPricesToken = ".product-box__price-bundle";
const productPriceOriginalToken = ".product-box__price-bundle del";
const productPriceToken = ".product-box__price-bundle strong";
const productLinkToken = "a.product-box__link";
const productImgToken = ".product-box__img-box img";
const productAvailability =
  ".product-box__availability a span.complex-link__underline";

/**
 *  Daily scraping info from products on page
 */

function mkPrice(price) {
  if (price !== "") {
    price = Number(
      encodeURIComponent(price.substr(0, price.length - 2))
        .replace(/%C2/g, "")
        .replace(/%A0/g, "")
    );
  } else {
    price = null;
  }
  return price;
}

async function scrapeProductListPage($, crawlContext) {
  const products = $(productItemToken);

  // we don't need to block pushes, we will await them all at the end
  const requests = [];
  const categories = [];
  const categoryScriptElement = $('script[type="application/ld+json"]');
  const jsonCategoriesData =
    categoryScriptElement.length !== 0
      ? JSON.parse(categoryScriptElement.html())
      : null;
  if (jsonCategoriesData !== null) {
    jsonCategoriesData.itemListElement.forEach(function (obj) {
      obj.position > 1 ? categories.push(obj.name) : null;
    });
  }
  for await (const productElement of products) {
    // This is WTF, without it, topElement.parent() sometimes returns 'undefined'
    const topElement = $(productElement);
    const product = {};

    product.itemId = topElement.find("h3").attr("product-id");

    product.itemName = topElement
      .find(productNameToken)
      .text()
      .trim()
      .replace(new RegExp(String.fromCharCode(160), ""), "");

    product.itemUrl = `${urlBase}${topElement
      .find(productLinkToken)
      .attr("href")}`;

    product.img = topElement.find(productImgToken).attr("src");

    product.currentPrice = mkPrice(
      topElement.find(productPriceToken).first().text()
    );

    const isCashback = topElement.find(productPricesToken).text().trim();
    if (isCashback.includes("Cena s")) {
      //If product use cashback or sale coupon, there is missing possible sale price and need scrap detail of product via api
      const response = await gotScraping({
        responseType: "json",
        url: `https://www.electroworld.cz/api/eshop/product-boxes?id[]=${product.itemId}`
      });
      const { statusCode, body } = response;
      if (statusCode !== 200) {
        return log.info(body.toString());
      } else {
        const oldPrice = body.productBoxes[0].priceBundle.oldPrice;
        product.originalPrice =
          oldPrice === null ? null : parseFloat(oldPrice.amount);
      }
    } else if (isCashback.includes("Ušetříte")) {
      const salePrice = mkPrice(
        topElement
          .find(".product-box__price-bundle .typo-complex-16")
          .last()
          .text()
          .trim()
      );
      product.originalPrice = product.currentPrice + salePrice;
    } else {
      let productPriceOriginal = topElement
        .find(productPriceOriginalToken)
        .text();
      product.originalPrice = mkPrice(productPriceOriginal);
    }

    // Everything is CZK only so why not ?
    product.currency = "CZK";

    product.category = categories;

    let ratingStr = topElement.find(productRatingToken).text().trim();
    let rating = null;
    ratingStr = ratingStr
      .replace("Hodnocení: ", "")
      .replace(", počet hodnocení:", "");
    ratingStr = ratingStr.split(" z ");
    if (ratingStr.length === 2) {
      rating = (parseFloat(ratingStr[0]) / parseFloat(ratingStr[1])) * 100;
    }
    // String casting is according to the spec o.0
    // https://docs.google.com/document/d/1qIwqARBTDSnkUrFItE1ZJZF1svLIYj3lD8fr82HUMtk/edit#
    product.rating = String(rating);

    // In case of this eshop, this could be done during data processing
    product.discounted = false;
    if (
      (product.originalPrice !== -1 || product.originalPrice !== null) &&
      product.originalPrice > product.currentPrice
    ) {
      product.discounted = true;
    }

    product.available = topElement
      .find(productAvailability)
      .first()
      .text()
      .includes("Skladem");

    product.sale = null;
    if (product.currentPrice !== null && product.originalPrice !== null) {
      product.sale = 1 - product.currentPrice / product.originalPrice;
    }
    if (!crawlContext.processedIds.has(product.itemId)) {
      crawlContext.processedIds.add(product.itemId);
      requests.push(
        crawlContext.dataset.pushData(product),
        uploadToS3v2(crawlContext.s3, product, {
          inStock: product.available
        })
      );
      crawlContext.stats.items++;
    } else {
      crawlContext.stats.itemsDuplicity++;
    }
  }
  console.log(`Found ${requests.length / 2} unique products`);
  // await all requests, so we don't end before they end
  await Promise.all(requests);
}

async function handleSubCategoryPage($, crawlContext) {
  const categories = $(categoryToken);
  const categoriesLinks = [];

  categories.each((i, e) => {
    const link = $(e).find("a");
    const categoryUrl = `${urlBase}${link.attr("href")}`;
    categoriesLinks.push(categoryUrl);
  });

  for (let i = 0; i < categoriesLinks.length; i++) {
    await crawlContext.requestQueue.addRequest({ url: categoriesLinks[i] });
  }
}

async function addProductListPagesToQueue($, crawlContext, firstPageURL) {
  const pages = $(pagingToken);
  const maxPages = Number($(pages[pages.length - 2]).text()) + 1;
  for (let i = 2; i < maxPages; i++) {
    const url = `${firstPageURL}?page=${i}`;
    console.info(`Adding page ${url} to queue.`);
    await crawlContext.requestQueue.addRequest({
      userData: { label: "nthPage", pageN: i },
      url: url
    });
  }
}

export async function fetchPage({ request, $ }, crawlContext) {
  if (request.userData.label === "nthPage") {
    log.info(
      `Scraping ${request.userData.pageN}th product list page: ${request.url},` +
        ` ${crawlContext.stats.pages}`
    );
    await scrapeProductListPage($, crawlContext);
    crawlContext.stats.pages++;
  } else {
    const productElements = $(productItemToken);
    const isSubCategoryPage = productElements.length === 0;

    if (isSubCategoryPage && crawlContext.type !== "BF") {
      log.info(
        `Found new subcategory page: ${request.url}, ${crawlContext.stats.categories}`
      );
      await handleSubCategoryPage($, crawlContext, request);
      crawlContext.stats.categories++;
    } else {
      log.info(
        `Scraping 1st product list page: ${request.url}, ${crawlContext.stats.pages}`
      );
      await addProductListPagesToQueue($, crawlContext, request.url);
      await scrapeProductListPage($, crawlContext);
      crawlContext.stats.pages++;
    }
  }
}

/**
 *  Product detail scraping
 */

function mkBreadcrumbsList($) {
  const categories = [];
  const categoriesArr = $(
    ".breadcrumb__list.l-in-box.u-maw-1310px.ol--reset"
  ).children();
  categoriesArr.each(i => {
    if (i > 0) {
      categories.push(
        $(categoriesArr[i])
          .find("a > span")
          .text()
          .replace(new RegExp(String.fromCharCode(160), ""))
      );
    }
  });
  return categories;
}

function mkImages($) {
  const images = [];
  const imgRoot = $("#product-other-imgs").find("a");
  imgRoot.each((i, e) => {
    images.push($(e).attr("href"));
  });
  return images.slice(0, images.length - 1);
}

function stripVoteCountStr(str, ratingStr) {
  const a = [/%0A/g, /%09/g, /%97/g, /%C3/g, ratingStr + "%"];
  str = encodeURIComponent(str);
  a.forEach(s => {
    str = str.replace(s, "");
  });
  str = str.substr(2);
  return str;
}

function mkRating($) {
  let ratingStr = $(".rating-stars__percents").text().trim().split("%")[0];
  let rating = -1;
  let voteCount = 0;
  if (ratingStr !== "") {
    ratingStr = ratingStr.split("%")[0];
    rating = Number(ratingStr) / 100;
    voteCount = $(".product-top__rating").text().trim();
    voteCount = stripVoteCountStr(voteCount, ratingStr);
  }
  return { value: rating, count: voteCount };
}

function mkProperty(name, value) {
  return {
    "@type": "PropertyValue",
    "name": name,
    "value": value
  };
}

function mkProperties($) {
  const properties = [];
  const baseParams = $(".product-params__main-wrap > ul").find("li");
  const otherParams = $(".ca-box").find("tbody");

  baseParams.each((i, e) => {
    const p = $(e).find("div > div");
    properties.push(mkProperty(p.find("span").text(), p.find("strong").text()));
  });

  otherParams.each((i, e) => {
    const trs = $(e).find("tr");
    trs.each((j, tr) => {
      tr = $(tr);
      properties.push(mkProperty(tr.find("th").text(), tr.find("td").text()));
    });
  });

  return properties;
}

export async function fetchDetail($, request, dataset) {
  const json = JSON.parse($("#snippet-productRichSnippet-richSnippet").html());

  const rating = mkRating($);
  const images = mkImages($);
  if (images.length === 0) {
    images.push(json["offers"]["image"]);
  }

  await dataset.pushData({
    "@context": "http://schema.org",
    "@type": "itemPage",
    "identifier": json["identifier"],
    "url": request.url,
    "breadcrumbs": {
      "@context": "http://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": mkBreadcrumbsList($)
    },
    "mainEntity": {
      "@context": "http://schema.org",
      "@type": "Product",
      "name": json["name"],
      "description": json["description"],
      "images": images,
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": rating.value,
        "ratingCount": rating.count
      },
      "offers": {
        "@type": "Offer",
        "priceCurrency": json["offers"]["priceCurrency"],
        "price": json["price"],
        "url": json["offers"]["url"],
        "itemCondition": "http://schema.org/NewCondition",
        "availability": "http://schema.org/InStock"
      },
      "brand": json["brand"]["name"],
      "sku": json["sku"],
      "mpn": null,
      "gtin13": json["gtin13"],
      "category": json["offers"]["category"],
      "additionalProperty": mkProperties($),
      "mainContentOfPage": [
        {
          "@type": "WebPageElement",
          "cssSelector": mainBodyToken,
          "encodingFormat": "text/html",
          "encoding": $(mainBodyToken).html()
        }
      ]
    }
  });
}

/**
 * Count all products from sitemap.xml
 */

async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

export async function countProducts(stats) {
  const stream = await requestAsBrowser({
    url: `${urlBase}/sitemap.xml`,
    stream: true
  });
  const buffer = await streamToBuffer(stream);
  const xmlString = buffer.toString();
  const $ = cheerio.load(xmlString, { xmlMode: true });
  const productXmlUrls = [];

  // Pick all product xml urls from sitemap
  $("sitemap").each(function () {
    const url = $(this).find("loc").text().trim();
    if (url.includes("products")) {
      productXmlUrls.push(url);
    }
  });
  log.info(`Enqueued ${productXmlUrls.length} product xml urls`);

  for await (const xmlUrl of productXmlUrls) {
    const stream = await requestAsBrowser({
      url: xmlUrl,
      stream: true
    });
    const buffer = await streamToBuffer(stream);
    const xmlString = buffer.toString();
    const $ = cheerio.load(xmlString, { xmlMode: true });
    $("url").each(function () {
      stats.items++;
    });
  }
  log.info(`Total items ${stats.items}x`);
}
