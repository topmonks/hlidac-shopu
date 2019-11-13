/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["mironet"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".product_detail");
    if (!elem) return;
    const itemId = $(".product_kosik_info input[name=Code]").value;
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".product_cena_box .product_dph");
    const originalPrice = cleanPrice(".fakcbox23 .product_dph");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product_cena");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
