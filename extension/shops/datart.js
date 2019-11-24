/* global cleanPrice */

window.shops = window.shops || {};
window.shops["datart"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector(".product-detail-box");
    if (!elem) return;
    const itemId = document.querySelector("#product-detail-header-top-wrapper")
      .dataset.id;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".product-detail-price");
    const originalPrice = cleanPrice(
      ".product-detail-strike-price-box .original del"
    );

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-detail-compare-box");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup({ "margin-bottom": "0" });
    elem.insertAdjacentHTML("beforebegin", markup);
    const style = document.createElement("style");
    style.textContent = `
      @media screen and (max-width: 767px) {
        #product-detail-header-top-wrapper {
          height: 972px;
        }
        #hlidacShopu {
          margin-top: 566px !important;
        }
      }
    `;
    elem.insertAdjacentElement("beforebegin", style);
    return elem;
  }
};
