/* global cleanPrice */

const pilulka = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const title = document.querySelector(".product-detail__header").innerText;
    const priceContainer = document.querySelector("div.js-product-prev");
    const itemId = priceContainer.attributes["data-product-id"].textContent;
    const currentPrice = cleanPrice(`.js-product-price-${itemId}`);
    const originalPrice = cleanPrice(
      document.querySelector(`.js-product-price-${itemId}`).nextElementSibling
    );
    const imageUrl = document.querySelector(".product-detail__images--img")
      .dataset["src"];

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-detail__reduced h1+div+div");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforeend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["pilulka"] = pilulka;
window.shops["pilulka_sk"] = pilulka;
