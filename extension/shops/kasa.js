/* global cleanPrice */

window.shops = window.shops || {};
window.shops["kasa"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector(".product-detail");
    if (!elem) return;
    const inputZbozi = document.querySelector('input[name="zbozi"]');
    const itemId = inputZbozi.getAttribute("value");
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice("#real_price");
    const originalPrice = cleanPrice(".before-price .text-strike");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-summary-tools");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforebegin", markup);
    return elem;
  }
};
