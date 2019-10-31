/* global $ */

/* exported itesco_loaded */
let itesco_loaded = false;
let last_href = null;

window.shops = window.shops || {};
window.shops["itesco"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      console.log("change detected");
      if (window.location.href !== last_href) {
        itesco_loaded = false;
        console.log("href changed", last_href, window.location.href);
        last_href = window.location.href;
      }
      if (itesco_loaded) return;

      const nakupItesco = $("h1.product-details-tile__title");
      if (nakupItesco) {
        itesco_loaded = true;
        cb().then(res => {
          itesco_loaded = res;
          console.log("loaded", itesco_loaded);
        });
      }

      // const itesco = $(".a-productDetail__buyOnlineButton.ddl");
      // if (itesco) {
      //   cb();
      // }
    });
    // Start observing the target node for configured mutations
    observer.observe(document.body, { childList: true, subtree: true  });
  },

  getInfo() {
    const elem = $(".product-details-page");
    if (!elem) return;
    const href = window.location.href;
    const match = href.match(/(\d+)$/);
    var itemId = null;
    if (match && match[1]) {
      itemId = match[1];
    }
    const title = $("h1").textContent.trim();

    return {itemId, title};
  },

  insertChartElement(chartMarkup) {
    // nakup.itesco.cz
    let elem = $(".product-controls--wrapper");
    if (!elem) {
      // itesco.cz
      elem = $(".a-productDetail__buyOnlineButton.ddl");
    }
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterbegin", markup);
    return elem;
  },
};
