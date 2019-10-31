/* global $ */

window.shops = window.shops || {};
window.shops["alza"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $(".priceDetail table#prices");
    if (!elem) return;

    const itemId = ($("#deepLinkUrl").getAttribute("content").match(/\d+$/) || [])[0];
    const title = $('h1[itemprop="name"]').innerText.trim();

    return { itemId, title };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".priceDetail table#prices");
    if (!elem) throw new Error("Element to add chart not found");
    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforebegin", markup);
    return elem;
  },
};
