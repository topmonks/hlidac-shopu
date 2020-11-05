/* global cleanPrice */

const benu = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const title = document.querySelector(".product-title-rating .title")
      .innerText;
    const currentPrice = cleanPrice(".buy strong.buy-box__big-price");
    const originalPrice = cleanPrice(".buy .buy-box__price-head del");
    const imageUrl = document.querySelector("meta[property='og:image']")
      .content;

    return { title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".buy-box__price-foot");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["benu"] = benu;
