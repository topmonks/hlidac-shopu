/* global cleanPrice */

const benu = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const richSnippet = JSON.parse(document.querySelector("#snippet-productRichSnippet-richSnippet").innerText);

    const title = richSnippet.name || document.querySelector(".product-title-rating .title")
      .innerText;
    const itemId = richSnippet.identifier;
    const currentPrice = cleanPrice(".buy strong.buy-box__big-price");
    const originalPrice = cleanPrice(".buy .buy-box__price-head del");
    const imageUrl = document.querySelector("meta[property='og:image']")
      .content;

    return { title, itemId, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".buy-box");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["benu"] = benu;
