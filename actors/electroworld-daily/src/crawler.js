const Apify = require("apify");
const cheerio = require("cheerio");

const {
  utils: { log, requestAsBrowser }
} = Apify;

const urlBase = "https://www.electroworld.cz";

const mainBodyToken = "#snippet--pdbox";

const productPageToken = ".product-list.product-list--tiles";
const productItemToken =
  ".product-list__item.product-box.product-box--tile.ajax-wrap";
const categoryToken = ".category-crossroad__item";
const pagingToken = ".paging__item.paging__item--link.ajax";

const productRatingToken = ".product-box__rating-stars.rating-stars";
const productNameToken = ".product-box__heading.complex-link__underline";
const productPriceOriginalToken = ".product-box__original-price";
const productPricesToken = ".product-box__prices";
const productPriceToken = ".product-box__price";
const productLinkToken = ".product-list__link.product-box__link";
const productImgToken = ".img-box__img.js-lazy.js-only.jsOnly.compare-img";
const productAvailability = ".product-box__availability";
const productCategoriesToken =
  ".breadcrumb__list.l-in-box.u-maw-1310px.ol--reset";

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
  for (let i = 0; i < products.length; i++) {
    // This is WTF, without it, topElement.parent() sometimes returns 'undefined'
    let p = products[i];
    p = $(p).find(".product-box__wrap");

    const topElement = $(p);

    const productLink = `${urlBase}${topElement
      .find(productLinkToken)
      .attr("href")}`;

    const isCashback = topElement.find(productPricesToken).text().trim();
    if (isCashback.includes("Cena s")) {
      //If product use cashback or sale coupon, there is missing possible sale price and need scrap detail of product
      await crawlContext.requestQueue.addRequest(
        {
          url: productLink,
          userData: { label: "detailPage" }
        },
        { forefront: true }
      );
      continue;
    }

    const productName = topElement
      .find(productNameToken)
      .text()
      .trim()
      .replace(new RegExp(String.fromCharCode(160), ""), "");

    let productPriceOriginal = topElement
      .find(productPriceOriginalToken)
      .text();
    productPriceOriginal = mkPrice(productPriceOriginal);
    const productPrice = parseFloat(
      topElement.find('strong[itemprop="price"]').attr("content")
    );
    if (isNaN(productPriceOriginal)) {
      productPriceOriginal =
        $(topElement).find(productPriceToken)[1].children[0].data;
      productPriceOriginal = productPriceOriginal
        .replace(/\t/g, "")
        .replace(/\n/g, "")
        .trim();
      productPriceOriginal = mkPrice(productPriceOriginal);
    }
    // Everything is CZK only so why not ?
    const currency = "CZK";

    const ratingStr = topElement.find(productRatingToken).text().trim();
    let rating = null;
    if (ratingStr !== "") {
      rating = Number(ratingStr.substr(0, ratingStr.length - 1)) / 100;
    }
    // String casting is according to the spec o.0
    // https://docs.google.com/document/d/1qIwqARBTDSnkUrFItE1ZJZF1svLIYj3lD8fr82HUMtk/edit#
    rating = String(rating);

    const productImg = topElement.find(productImgToken).attr("data-src");

    let productID = topElement.parent().attr("id").split("-");
    productID = productID[productID.length - 2];

    // In case of this eshop, this could be done during data processing
    let discount = false;
    if (
      (productPriceOriginal !== -1 || productPriceOriginal !== null) &&
      productPriceOriginal > productPrice
    ) {
      discount = true;
    }

    const availabilityTop = topElement.find(productAvailability).find("a");
    const avail1 = $(availabilityTop[0])
      .attr("class")
      .includes("availability--available");
    const avail2 =
      $(availabilityTop[1]).find("span").attr("class") ===
      "availability--available";
    const available = avail1 || avail2;

    const categories = [];
    let categoriesArr = $(productCategoriesToken).children();
    categoriesArr.each((i, e) => {
      if (i > 0) {
        categories.push($(categoriesArr[i]).find("a > span").text());
      }
    });

    let sale = null;
    if (productPrice !== null && productPriceOriginal !== null) {
      sale = 1 - productPrice / productPriceOriginal;
    }
    const product = {
      itemId: productID,
      img: productImg,
      itemUrl: productLink,
      itemName: productName,
      currentPrice: productPrice,
      originalPrice: productPriceOriginal,
      sale: sale,
      rating: rating,
      discounted: discount,
      category: categories,
      currency: currency,
      inStock: available
    };
    if (!crawlContext.processedIds.has(product.itemId)) {
      crawlContext.processedIds.add(product.itemId);
      requests.push(
        crawlContext.dataset.pushData(product),
        crawlContext.uploadToS3(
          crawlContext.s3,
          "electroworld.cz",
          await crawlContext.s3FileName(product),
          "jsonld",
          crawlContext.toProduct(product, {})
        )
      );
      crawlContext.stats.items++;
    } else {
      crawlContext.stats.itemsDuplicity++;
    }
  }

  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);
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
  const maxPages = Number($(pages[pages.length - 1]).text()) + 1;
  for (let i = 2; i < maxPages; i++) {
    const url = `${firstPageURL}?page=${i}`;
    console.info(`Adding page ${url} to queue.`);
    await crawlContext.requestQueue.addRequest({
      userData: { label: "nthPage", pageN: i },
      url: url
    });
  }
}

exports.fetchPage = async ({ request, $ }, crawlContext) => {
  if (request.userData.label === "nthPage") {
    log.info(
      `Scraping ${request.userData.pageN}th product list page: ${request.url},` +
        ` ${crawlContext.stats.pages}`
    );
    await scrapeProductListPage($, crawlContext);
    crawlContext.stats.pages++;
  } else if (request.userData.label === "detailPage") {
    await scrapeProductListPageDetail($, crawlContext);
  } else {
    const productElements = $(productPageToken).find(productItemToken);
    const isSubCategoryPage = productElements.length === 0;

    if (isSubCategoryPage) {
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
};

/**
 *  Daily scraping info from products on page detail
 */

async function scrapeProductListPageDetail($, crawlContext) {
  const json = JSON.parse($("#snippet-productRichSnippet-richSnippet").html());

  const productPrice = json["offers"]["price"];
  const productPriceOriginal = parseFloat(
    $(".product-top__price")
      .find("del")
      .first()
      .text()
      .trim()
      .replace(/[^\d,]+/g, "")
      .replace(",", ".")
  );

  let sale = null;
  if (productPrice !== null && productPriceOriginal !== null) {
    sale = 1 - productPrice / productPriceOriginal;
  }

  const rating = mkRating($);

  const product = {
    itemId: $("#product-main-img")[0].attribs["data-itemid"],
    img: json["offers"]["image"],
    itemUrl: json["offers"]["url"],
    itemName: json["name"],
    currentPrice: productPrice,
    originalPrice: productPriceOriginal,
    sale: sale,
    rating: rating,
    discounted: sale > 0,
    category: json["offers"]["category"],
    currency: json["offers"]["priceCurrency"],
    inStock: json["offers"]["availability"].includes("InStock")
  };

  if (!crawlContext.processedIds.has(product.itemId)) {
    crawlContext.processedIds.add(product.itemId);
    await crawlContext.dataset.pushData(product);
    await crawlContext.uploadToS3(
      crawlContext.s3,
      "electroworld.cz",
      await crawlContext.s3FileName(product),
      "jsonld",
      crawlContext.toProduct(product, {})
    );
    crawlContext.stats.items++;
  } else {
    crawlContext.stats.itemsDuplicity++;
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
  categoriesArr.each((i, e) => {
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

exports.fetchDetail = async ($, request, dataset) => {
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
};

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

exports.countProducts = async stats => {
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
};
