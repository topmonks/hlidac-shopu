/* global cleanPrice */

let okay = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = document.querySelector("#page-product-detail");
    if (!elem) return;
    const data = JSON.parse(document.querySelector(".js-gtm-product").dataset.product)
    const itemId = data.id;
    const title = data.name;
    const currentPrice = data.priceWithTax;
    const originalPrice = cleanPrice("#product_price_recomended");
    const imageUrl = document.querySelector(".js-zoomingImageSmall").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector("#potrebujeteporadit");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforebegin", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["okay"] = okay;
window.shops["okay_sk"] = okay;
