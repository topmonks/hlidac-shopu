/* global cleanPrice */

window.shops = window.shops || {};
window.shops["mironet"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector(".product_detail");
    if (!elem) return;
    const itemId = document.querySelector(
      ".product_kosik_info input[name=Code]"
    ).value;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".product_cena_box .product_dph span");
    const originalPrice = cleanPrice(".fakcbox23 .product_dph");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product_kosik_info");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
