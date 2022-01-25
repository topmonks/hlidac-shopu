const Apify = require("apify");

const {
  utils: { log }
} = Apify;

const { COUNTRY } = require("./consts");

// at this point, the main page is already loaded in $
const handleStart = async ($, crawlContext) => {
  // const requestQueue = await Apify.openRequestQueue();
  // start page, add all categories links to requestQueue
  let links = $("nav > ul")
    .find("li.nav-nested__link-parent > a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  if (crawlContext.development) {
    links = links.slice(0, 1);
    log.debug("Develoment mode, adding only 1 list to requestQueue");
  }
  for (const link of links) {
    // request is an object, setting url to link and in userdata, setting new dictionary label: LIST
    // it is me who is setting the label value, just using it for making the crawler fcn more clear
    await crawlContext.requestQueue.addRequest({
      url: `${crawlContext.baseUrl}${link}?sort=price-ascending`,
      userData: { label: "LIST" }
    });
    crawlContext.stats.urls += 1;
  }
  log.debug(`Found ${links.length}x categories => added to queue`);
};

const handleList = async ($, crawlContext) => {
  //https://help.boostcommerce.net/article/458-filter-search-api
  // const requestQueue = await Apify.openRequestQueue();
  // add detail pages of all products on the page to requestQueue
  /*  let links = $("li.js-gtm-product-wrapper")
      .find(".title")
      .find("a.js-gtm-product-link")
      .map(function () {
        return $(this).attr("href");
      })
      .get();
    /!*  if (crawlContext.development) {
      links = links.slice(0, 1);
      log.debug("Develoment mode, crawl 1 product");
    }*!/
    for (const link of links) {
      await requestQueue.addRequest({
        url: link,
        userData: { label: "DETAIL" }
      });
      crawlContext.stats.urls += 1;
    }
    log.debug(`Found ${links.length}x items => added to queue`);*/

  // add next page to requestQueue, if exists
  const nextLink = $("a.pagination-next").attr("href");
  console.log(nextLink);
  if (nextLink) {
    await crawlContext.requestQueue.addRequest({
      url: nextLink,
      userData: { label: "LIST" }
    });
    log.debug(`Found pagination page ${nextLink} => added to queue`);
    crawlContext.stats.urls += 1;
  }
};

const handleListSK = async ({ $, requestQueue }, crawlContext) => {
  // const requestQueue = await Apify.openRequestQueue();
  // add detail pages of all products on the page to requestQueue
  console.log($("div.collection-matrix__wrapper").html());
  let links = $("div.collection-matrix__wrapper")
    .find(".product__grid-item")
    .find(".product__imageContainer > a")
    .map(function () {
      return $(this).attr("href");
    })
    .get();
  console.log(links);
  /*  if (crawlContext.development) {
    links = links.slice(0, 1);
    log.debug("Develoment mode, crawl 1 product");
  }*/
  for (const link of links) {
    await requestQueue.addRequest({
      url: link,
      userData: { label: "DETAIL" }
    });
    crawlContext.stats.urls += 1;
  }

  // add next page to requestQueue, if exists
  const nextLink = $("a.next").attr("href");
  if (nextLink) {
    await requestQueue.addRequest({
      url: nextLink,
      userData: { label: "LIST" }
    });
    crawlContext.stats.urls += 1;
  }
};

const handleDetail = async ({ request, $ }, crawlContext, country) => {
  // parse detail page

  const productDescription = JSON.parse(
    $("div#page-product-detail").children().first().attr("data-product")
  );

  const result = {};
  result.itemUrl = request.url;
  result.itemId = productDescription.id;
  result.itemName = $(".product-title.js-productTitle").text().trim();
  result.currentPrice =
    $("#product_price_wv").length > 0
      ? parseFloat(
          $("#product_price_wv")
            .text()
            .replace(/\s/g, "")
            .replace(/,/, ".")
            .trim()
        )
      : null;
  result.originalPrice =
    $("#product_price_recomended").length > 0
      ? parseFloat(
          $("#product_price_recomended")
            .text()
            .replace(/\s/g, "")
            .replace(/,/, ".")
            .trim()
        )
      : null;
  const discountText = country === COUNTRY.CZ ? "SLEVA" : "ZĽAVA";
  let additionalDiscount = productDescription.labels.find(x =>
    x.includes(discountText)
  );
  if (additionalDiscount) {
    if (additionalDiscount.includes("DPH")) {
      additionalDiscount = 21;
      if (!result.originalPrice) result.originalPrice = result.currentPrice;
      result.currentPrice = Math.floor(result.currentPrice / 1.21);
    } else {
      additionalDiscount = parseFloat(
        additionalDiscount.replace(discountText, "").replace(/,/, ".").trim()
      );
      if (additionalDiscount) {
        let price;
        if (country === COUNTRY.CZ) {
          price = Math.trunc(
            result.currentPrice * ((100 - additionalDiscount) / 100)
          );
        } else {
          price =
            Math.round(
              result.currentPrice * ((100 - additionalDiscount) / 100) * 100
            ) / 100;
        }
        if (!result.originalPrice) result.originalPrice = result.currentPrice;
        result.currentPrice = price;
      }
    }
  }
  result.discounted = result.currentPrice < result.originalPrice;
  result.breadcrumb = $("p#menu-breadcrumb").text().trim().split("OKAY »")[1];
  result.currency = country === COUNTRY.CZ ? "CZK" : "EUR";
  result.inStock = !!$("p#availability:contains(kus)").text();
  result.img = $("a#js-zoomingLinkGallery").attr("href");
  result.vatInfo = $(".price-highlight.price-name").text();
  result.blackFriday = $('p.flags img[alt="Black friday"]').length !== 0;

  return result;
};

module.exports = {
  handleStart,
  handleList,
  handleDetail
};
