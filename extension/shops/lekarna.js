/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["lekarna"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".detail-top");
    if (!elem) return;
    const itemId = $(".product__code span").textContent.trim();
    const title = $("h1").textContent.trim();
    const currentPrice = document
      .querySelector("[itemprop=price]")
      .getAttribute("content");
    const originalPrice = cleanPrice(".price__old");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product__price-and-form");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
