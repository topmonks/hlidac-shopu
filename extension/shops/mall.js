/* global cleanPrice */

const mall = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector(".price-wrapper, .prices-wrapper");
    if (!elem) return;

    const itemId = document
      .querySelector("span[data-sel=\"catalog-number\"]")
      .innerText.trim();
    const title = document
      .querySelector("h1[itemprop=\"name\"]")
      .innerText.trim();
    const currentPrice = cleanPrice("[itemprop=price]");
    const originalPrice = cleanPrice(".old-new-price .rrp-price, .old-price > del:nth-child(1)");
    const imageUrl = document.querySelector(".gallery-magnifier__normal").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-footer, .other-options-box, .detail-prices-wrapper");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["mall"] = mall;
window.shops["mall_sk"] = mall;
