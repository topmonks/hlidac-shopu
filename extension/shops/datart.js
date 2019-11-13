/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["datart"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".product-detail-box");
    if (!elem) return;
    const itemId = $("#product-detail-header-top-wrapper").dataset.id;
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".product-detail-price");
    const originalPrice = cleanPrice(
      ".product-detail-strike-price-box .original"
    );

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product-detail-price-box");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
