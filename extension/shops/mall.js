/* global cleanPrice */

window.shops = window.shops || {};
window.shops["mall"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector(".price-wrapper");
    if (!elem) return;

    const itemId = document
      .querySelector('span[data-sel="catalog-number"]')
      .innerText.trim();
    const title = document
      .querySelector('h1[itemprop="name"]')
      .innerText.trim();
    const currentPrice = cleanPrice("[itemprop=price]");
    const originalPrice = cleanPrice(".old-new-price .rrp-price");
    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-footer");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
