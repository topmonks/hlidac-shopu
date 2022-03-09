import { LABELS, MAIN_URL } from "./const.js";

export function createInitRequests() {
  const sources = [];
  /*sources.push({
    url: "https://www.lidl.cz/aktualni-nabidka",
    userData: {
      label: LABELS.MAIN_NABIDKA
    }
  });
  sources.push({
    url: "https://www.lidl.cz/cerstve-produkty",
    userData: {
      label: LABELS.MAIN_NABIDKA
    }
  });
  sources.push({
    url: "https://www.lidl.cz/c/kategorie/s10004543",
    userData: {
      label: LABELS.LIDL_SHOP
    }
  });
  sources.push({
    url: "https://www.lidl.cz/c/hity-tydne/a10004407",
    userData: {
      label: LABELS.LIDL_SHOP_CAT
    }
  });
  sources.push({
    url: "https://www.lidl.cz/q/query/Slevy?pageId=20029807",
    userData: {
      label: LABELS.LIDL_SHOP_CAT
    }
  });
  sources.push({
    url: "https://www.lidl.cz/p/hn8schlafsysteme-7zonova-tastickova-matrace-xxl-gelstar-t-1000/p100241432",
    userData: {
      label: LABELS.LIDL_SHOP_DETAIL
    }
  });*/
  sources.push({
    url: "https://www.lidl.cz/q/query/Slevy?offset=0&sort=Price-asc",
    userData: {
      label: LABELS.LIDL_SHOP_CAT
    }
  });
  sources.push({
    url: "https://www.lidl.cz/c/kategorie/s10004543",
    userData: {
      label: LABELS.LIDL_SHOP_SECTION,
      level: 1
    }
  });
  return sources;
}

export function getItemId(url) {
  const arr = url.split("/");
  return arr[arr.length - 1];
}

export function getBaseProducts($) {
  const articles = $("article.product").toArray();
  const products = [];
  if (articles.length > 0) {
    for (const article of articles) {
      const title = $(article).find("h3").text().trim();
      const mainFrame = $(article).find("a.product__body");
      const itemUrl = mainFrame.attr("href");
      const imageSource = mainFrame.find("picture source")[0];
      const imageLargeArr = $(imageSource).data("srcset").split(",");
      const result = {
        itemId: getItemId(itemUrl),
        itemUrl: `${MAIN_URL}${itemUrl}`,
        itemName: title,
        currency: "CZK",
        img: imageLargeArr[0],
        currentPrice: parseFloat(
          $(article).find(".pricebox__price").text().trim()
        ),
        originalPrice: null,
        discounted: false
      };
      const price = $(article)
        .find(".pricebox__recommended-retail-price")
        .text()
        .trim();
      if (price && price.length > 0) {
        result.discounted = true;
        result.originalPrice = parseFloat(price);
      }
      products.push(result);
    }
  }
  return products;
}

export function getShopProduct($, url) {
  let breadcrumbs = $(".m-breadcrumbs--full .m-breadcrumbs__item").toArray();
  breadcrumbs = breadcrumbs.slice(1, breadcrumbs.length - 1);
  const title = $("h1").text().trim();
  const imageSource = $("img.gallery-image__img").toArray()[0];
  const price = $(".buybox__item .m-price__bottom .m-price__price");
  const result = {
    itemId: getItemId(url),
    itemUrl: url,
    itemName: title,
    currency: "CZK",
    currentPrice: parseFloat(price.text().trim()),
    img: $(imageSource).attr("src"),
    originalPrice: null,
    discounted: false,
    category: breadcrumbs.map(b => $(b).text().trim()).join(" > ")
  };
  const strikePrice = $(".buybox__item .m-price__top");
  if (strikePrice && strikePrice.length > 0) {
    result.discounted = true;
    result.originalPrice = parseFloat(strikePrice.text().trim());
  }
  return result;
}
