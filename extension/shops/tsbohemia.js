/* global $ */

window.shops = window.shops || {};
window.shops["tsbohemia"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector("#stoitem_detail");
    if (!elem) return;
    const itemId = document.querySelector(".sti_detail_head").dataset.stiid;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = document
      .querySelector(".prc.wvat .price")
      .textContent.split("Kč")[0]
      .replace(",-", "")
      .replace(/\s/g, "");
    const originalPrice = cleanPrice(".prc.endprc .price");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-tools");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup({
      width: "calc(100% - 32px)",
      "align-self": "center"
    });
    elem.insertAdjacentHTML("beforebegin", markup);
    return elem;
  }
};
