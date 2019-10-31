/* global $ */

window.shops = window.shops || {};
window.shops["mall"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $(".price-wrapper");
    if (!elem) return;

    const itemId = $('span[data-sel="catalog-number"]').innerText.trim();
    const title = $('h1[itemprop="name"]').innerText.trim();

    return { itemId, title };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".price-wrapper");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
