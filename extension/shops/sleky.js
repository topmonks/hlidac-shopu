/* global cleanPrice */

const sleky = {
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
    const title = document.querySelector("h1[itemprop='name']").innerText;
    const form = document.querySelector(".orderbox form");
    const itemId = form.dataset.productId;
    const currentPrice = cleanPrice(form.querySelector("strong.fullprice"));
    const originalPrice = cleanPrice(form.querySelector("dl>dt+dd"));
    const imageUrl = document.querySelector("img[itemprop=image]").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".orderbox");
    // const elem = document.querySelector(".desc>hr");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["sleky"] = sleky;
