/* global $ */

window.shops = window.shops || {};
window.shops["mironet"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $(".product_detail");
    if (!elem) return;
    const itemId = $(".product_kosik_info input[name=Code]").value;
    const title = $("h1").textContent.trim();

    return { itemId, title };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product_cena");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
