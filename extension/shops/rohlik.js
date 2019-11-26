/* global cleanPrice */

/* exported itesco_loaded */
let rohlik_loaded = false;
let rohlik_last_href = null;

window.shops = window.shops || {};
window.shops["rohlik"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== rohlik_last_href) {
        rohlik_loaded = false;
        rohlik_last_href = window.location.href;
      }
      if (rohlik_loaded) return;

      const detail = document.querySelector("#productDetail");
      if (detail) {
        rohlik_loaded = true;
        cb().then(res => {
          rohlik_loaded = res;
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  getInfo() {
    const elem = document.querySelector("#productDetail");
    if (!elem) return;
    const itemId = document.querySelector(
      "#productDetail button[data-product-id]"
    ).dataset.productId;
    const title = document.title.split("-");
    const t = title[0].trim();
    const currentPrice = cleanPrice(
      `#productDetail .actionPrice,
       #productDetail .currentPrice`
    );
    const originalPrice = cleanPrice("#productDetail del");

    return { itemId, title: t, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector("#productDetail .AmountCounter");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
