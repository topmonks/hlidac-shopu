const Apify = require("apify");
const cheerio = require("cheerio");

const {
  utils: { log, requestAsBrowser }
} = Apify;

const urlBase = "https://www.electroworld.cz";

const productPageToken = ".product-list.product-list--tiles";
const productItemToken =
  ".product-list__item.product-box.product-box--tile.ajax-wrap";
const categoryToken = ".category-crossroad__item";
const pagingToken = ".paging__item.paging__item--link.ajax";

const productRatingToken = ".product-box__rating-stars.rating-stars";
const productNameToken = ".product-box__heading.complex-link__underline";
const productPriceOriginalToken = ".product-box__original-price";
const productPriceToken = ".product-box__price";
const productLinkToken = ".product-list__link.product-box__link";
const productImgToken = ".img-box__img.js-lazy.js-only.jsOnly.compare-img";
const productAvailability = ".product-box__availability";
const productCategoriesToken =
  ".breadcrumb__list.l-in-box.u-maw-1310px.ol--reset";

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
  const scraped = [];
  for (let i = 0; i < products.length; i++) {
    // This is WTF, without it, topElement.parent() sometimes returns 'undefined'
    let p = products[i];
    p = $(p).find(".product-box__wrap");

    const topElement = $(p);

    const productName = topElement
      .find(productNameToken)
      .text()
      .trim()
      .replace(new RegExp(String.fromCharCode(160), ""), "");

    let productPriceOriginal = topElement
      .find(productPriceOriginalToken)
      .text();
    productPriceOriginal = mkPrice(productPriceOriginal);
    let productPrice = topElement.find(productPriceToken).text().trim();
    productPrice = mkPrice(productPrice);
    if (isNaN(productPrice)) {
      productPrice = topElement
        .find(".product-box__prices")
        .find(".product-box__price")[0].children[0];
      productPrice = productPrice.data.replace(/\t/g, "").replace(/\n/g, "");
      productPrice = mkPrice(productPrice);

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

    const productLink = `${urlBase}${topElement
      .find(productLinkToken)
      .attr("href")}`;

    const productImg = topElement.find(productImgToken).attr("data-src");

    let productID = topElement.parent().attr("id").split("-");
    productID = productID[productID.length - 2];

    // In case of this eshop, this could be done during data processing
    let discount = false;
    if (productPriceOriginal !== -1 && productPriceOriginal !== productPrice) {
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

    if (!crawlContext.processedIds.has(productID)) {
      scraped.push({
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
      });
      crawlContext.stats.items++;
    } else {
      crawlContext.stats.itemsDuplicity++;
    }
  }

  await crawlContext.dataset.pushData(scraped);
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

async function streamToBuffer(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

exports.fetchPage = async ({ request, $ }, crawlContext) => {
  if (request.userData.label === "nthPage") {
    log.info(
      `Scraping ${request.userData.pageN}th product list page: ${request.url},` +
        ` ${crawlContext.stats.pages}`
    );
    await scrapeProductListPage($, crawlContext);
    crawlContext.stats.pages++;
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
