import { LABELS, COOP_BOX_URL } from "./main.js";

/**
 * @param {CheerioSelector} $
 * @param element
 * @return {string | jQuery}
 */
export const parseScriptJson = function ($, element) {
  return $(element)
    .map((i, el) => $(el).html())
    .get()
    .toString()
    .trim();
};

/**
 * @param {CheerioSelector} $
 * @param {Request} request
 * @return {Array}
 */
export const extractMainCategories = function ($, request) {
  const requests = [];
  $("div.banner-bottom-block ul li a").each((_, el) => {
    requests.push({
      url: $(el).attr("href"),
      userData: {
        ...request.userData,
        label: LABELS.MAIN_CATEGORY,
        mainCategory: $(el).find("span").text().trim()
      }
    });
  });
  return requests;
};

/**
 * @param {CheerioSelector} $
 * @param {Request} request
 * @return {Array}
 */
export const extractCategories = function ($, request) {
  const { mainCategory, marketTitle, marketId } = request.userData;
  const requests = [];
  $(".filter-content ol.items li a").each((_, el) => {
    const categoryText = $(el)
      .first()
      .contents()
      .filter(function () {
        return this.type === "text";
      })
      .text()
      .trim();
    requests.push({
      url: $(el).attr("href"),
      userData: {
        marketTitle,
        marketId,
        categories: [mainCategory, categoryText],
        label: LABELS.CATEGORY,
        lastPage: 1
      }
    });
  });
  return requests;
};

/**
 * @param {CheerioSelector} $
 * @param {Request} request
 * @return {Array}
 */
export const extractPages = function ($, request) {
  const requests = [];
  let lastPage = 0;
  $("ul.pages-items")
    .eq(0)
    .find("li a.page")
    .each((_, el) => {
      const page = $(el).find("span:not(.label)").text();
      if (page > request.userData.lastPage) {
        requests.push({
          url: $(el).attr("href")
        });
      }
      lastPage = parseInt(page);
    });
  return requests.map(r => {
    return {
      ...r,
      userData: {
        ...request.userData,
        label: LABELS.CATEGORY,
        lastPage
      }
    };
  });
};

/**
 * @param {CheerioSelector} $
 * @param {Request} request
 * @return {Array}
 */
export const extractItemDetails = function ($, request) {
  const requests = [];
  $(".product-items > li .product-item-photo").each((_, el) => {
    requests.push({
      url: $(el).attr("href"),
      userData: {
        ...request.userData,
        label: LABELS.DETAIL
      }
    });
  });
  return requests;
};

/**
 * @param {CheerioSelector} $
 * @param {Request} request
 * @return {Object}
 */
export const extractItem = function ($, request) {
  const dataScripts = $('script[type="text/x-magento-init"]').toArray();
  const result = {
    category: request.userData.categories,
    marketTitle: request.userData.marketTitle,
    marketId: request.userData.marketId
  };
  const descriptionInfos = $(".product-main-description .extra-info").toArray();
  for (const info of descriptionInfos) {
    if ($(info).find("u").text().includes("EAN")) {
      result.ean = $(info).find("span:not(.title)").text().trim();
    }
  }
  for (const script of dataScripts) {
    const scriptText = parseScriptJson($, script);
    if (scriptText.includes("Magento_Catalog/js/product")) {
      const { data } =
        JSON.parse(scriptText)["*"]["Magento_Catalog/js/product/view/provider"];
      result.currency = data.currency;
      const item = Object.values(data.items)[0];
      result.itemName = item.name;
      result.itemUrl = item.url;
      result.itemId = item.id;
      result.concatId = `${result.marketId}-${item.id}`;
      result.inStock = item.is_salable === "1";
      result.img = item.images.length > 0 ? item.images[0].url : null;
      const { price_info } = item;
      result.currentPrice = price_info.final_price;
      if (result.currentPrice < price_info.regular_price) {
        result.originalPrice = price_info.regular_price;
        result.discounted = true;
      }
      return result;
    }
  }
};

/**
 * @param {CheerioSelector} $
 * @param {Request} request
 * @return {Object}
 */
export const extractCoopBoxCategories = function ($, request) {
  const requests = [];
  $('form[name="PB_MENU"] .l3-link').each((_, el) => {
    requests.push({
      url: "https://eshop.coop-box.cz/net.php",
      uniqueKey: `${$(el).attr("id")}${Math.random()}`,
      userData: {
        ...request.userData,
        label: LABELS.COOP_BOX_CATEGORY,
        sourceId: $(el).attr("id").replace("PB_MENU__", ""),
        actualPage: 1
      }
    });
  });
  return requests;
};

/**
 * @param {CheerioSelector} $
 * @param {Request} request
 * @return {Object}
 */
export const extractCoopBoxItems = function ($, request) {
  const { marketTitle, marketId } = request.userData;
  const items = [];
  $("#PB__I .pb-item").each((_, el) => {
    const result = {
      marketTitle,
      marketId
    };
    const $item = $(el);
    const pbItemId = $item.attr("id");
    const match = pbItemId.match(/\d+/);
    if (match) {
      result.itemId = match[0];
    }
    const img = $item.find(".pb-item-image-group img").attr("src");
    result.img = `${COOP_BOX_URL}${img}`;
    result.itemName = $item.find("h3").text().trim();
    result.currentPrice = parseFloat(
      $item.find(".pb-item-height-group-4").text().trim().replace(",", ".")
    );
    result.originalPrice = parseFloat(
      $item.find(".pb-item-height-group-5").text().trim().replace(",", ".")
    );
    items.push(result);
  });
  return items;
};

export const extractCoopBoxPages = function ($, request) {
  const { actualPage } = request.userData;
  const requests = [];
  let lastPage = actualPage;
  $(".pb-nav > div > a.go-btn").each((_, el) => {
    const page = parseInt($(el).text().trim(), 10);
    if (page > actualPage) {
      lastPage = page;
      requests.push({
        url: "https://eshop.coop-box.cz/net.php",
        uniqueKey: `${$(el).attr("id")}${Math.random()}`
      });
    }
  });
  return requests.map(r => {
    return {
      url: r.url,
      uniqueKey: r.uniqueKey,
      userData: {
        ...request.userData,
        label: LABELS.COOP_BOX_NEXT_PAGE,
        actualPage: lastPage
      }
    };
  });
};
