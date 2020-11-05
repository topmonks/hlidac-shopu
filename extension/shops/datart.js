/* global cleanPrice */

const datart = {
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
    const imageUrl = document.querySelector("#detail-image-0 img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const css = `
      @media screen and (max-width: 767px) {
        #product-detail-header-top-wrapper {
          height: 972px;
        }
        #hlidacShopu {
          margin-top: 566px !important;
        }
      }
    `;

    const elem = document.querySelector(".product-detail-compare-box");
    if (elem) {
      const markup = chartMarkup({ "margin-bottom": "0" });
      elem.insertAdjacentHTML("beforebegin", markup);
      const style = document.createElement("style");
      style.textContent = css;
      elem.insertAdjacentElement("beforebegin", style);
      return elem;
    }

    const archiveElem = document.querySelector(".product-detail-price-box");
    if (archiveElem) {
      const markup = chartMarkup({ "margin-bottom": "0" });
      archiveElem.insertAdjacentHTML("afterend", markup);
      const style = document.createElement("style");
      style.textContent = css;
      archiveElem.insertAdjacentElement("beforebegin", style);
      return archiveElem;
    }

    throw new Error("Element to add chart not found");
  }
};

window.shops = window.shops || {};
window.shops["datart"] = datart;
window.shops["datart_sk"] = datart;
