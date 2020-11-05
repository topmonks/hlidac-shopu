/* global cleanPrice */

const prozdravi = {
  onDetailPage(cb) {
    cb();
  },

  waitForElement(selector, timeout = 5) {
    return new Promise((resolve, reject) => {
      let count = 0;
      const getElement = () => {
        count++;
        const elem = document.querySelector(selector);
        if (elem) {
          return resolve(elem);
        }
        if (count >= timeout) {
          return reject();
        }
        setTimeout(getElement, 100);
      };
      getElement();
    });
  },

  async getInfo() {
    const title = document.querySelector("h1.product-header__header").innerText;
    const priceContainer = await this.waitForElement(
      ".product-prices-block__inner"
    );
    const itemId = priceContainer.querySelector("input[name='product-code']")
      .value;
    const originalPrice = cleanPrice(
      priceContainer.querySelector("span.product-prices-block__backup-price")
    );
    const currentPrice = cleanPrice(
      priceContainer.querySelector(".product-prices-block__final-price")
    );
    const imageUrl = document.querySelector(".product-image-gallery__image")
      .src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(
      ".product-prices-block.product-prices-block--single-product"
    );
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforeend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["prozdravi"] = prozdravi;
