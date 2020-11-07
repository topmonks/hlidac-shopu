/* global cleanPrice */

let globusLoaded = false;
let lastHref = null;

const globus = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== lastHref) {
        globusLoaded = false;
        lastHref = window.location.href;
      }
      if (globusLoaded) return;

      const nakupGlobus = document.querySelector(
        ".detail-title h1"
      );
      if (nakupGlobus) {
        globusLoaded = true;
        cb(true).then(res => {
          globusLoaded = res;
        });
      }
    });
    // Start observing the target node for configured mutations
    observer.observe(document.body, { childList: true, subtree: true });
    addEventListener("load", () => cb());
  },

  getInfo() {
    const elem = document.querySelector("#detail-container");
    if (!elem) return;
    const itemId = elem.getAttribute("data-stock-item-code");
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".detail-price-now");
    const originalPrice = cleanPrice(".product-discount strong");
    const imageUrl = document.querySelector(".detail-image img").src;

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector("#detail-box");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforeend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["iglobus"] = globus;
