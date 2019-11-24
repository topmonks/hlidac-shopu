/* global cleanPrice*/

/* exported itesco_loaded */
let itesco_loaded = false;
let last_href = null;

window.shops = window.shops || {};
window.shops["itesco"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== last_href) {
        itesco_loaded = false;
        last_href = window.location.href;
      }
      if (itesco_loaded) return;

      const nakupItesco = document.querySelector(
        "h1.product-details-tile__title"
      );
      if (nakupItesco) {
        itesco_loaded = true;
        cb().then(res => {
          itesco_loaded = res;
        });
      }

      // const itesco = $(".a-productDetail__buyOnlineButton.ddl");
      // if (itesco) {
      //   cb();
      // }
    });
    // Start observing the target node for configured mutations
    observer.observe(document.body, { childList: true, subtree: true });
    addEventListener("load", () => cb());
  },

  getInfo() {
    const elem = document.querySelector(".product-details-page");
    if (!elem) return;
    const href = window.location.href;
    const match = href.match(/(\d+)$/);
    var itemId = null;
    if (match && match[1]) {
      itemId = match[1];
    }
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice(".price-per-sellable-unit .value");
    // TODO: parse originalPrice with regex from .promo-content-small .offer-text
    return { itemId, title, currentPrice };
  },

  insertChartElement(chartMarkup) {
    // nakup.itesco.cz
    let elem = document.querySelector(".product-controls--wrapper");
    // if (!elem) {
    //   // itesco.cz
    //   elem = $(".a-productDetail__buyOnlineButton.ddl");
    // }
    if (!elem) throw new Error("Element to add chart not found");

    const styles = {
      width: "60%",
      float: "right",
      margin: "0 16px 16px"
    };
    const markup = chartMarkup(styles);
    elem.insertAdjacentHTML("afterend", markup);
    const style = document.createElement("style");
    style.textContent = `
      @media screen and (max-width: 767px) {
        .product-details-tile .product-controls--wrapper .basket-feedback__wrapper {
          min-height: 0;
        }
        #hlidacShopu {
          margin-top: 0 !important;
          width: calc(100% - 32px) !important;
        }
      }
    `;
    elem.insertAdjacentElement("beforebegin", style);
    return elem;
  }
};
