/* global $, cleanPrice */

let kosik_loaded = false;
let kosik_last_href = null;

window.shops = window.shops || {};
window.shops["kosik"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== kosik_last_href) {
        kosik_loaded = false;
        kosik_last_href = window.location.href;
      }
      if (kosik_loaded) return;

      const detail = $(".product-detail__main-info");
      if (detail) {
        kosik_loaded = true;
        cb().then(res => {
          kosik_loaded = res;
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  getInfo() {
    const elem = $("#snippet-addProductToCartForm->.amount[product-data]");
    if (!elem) return;
    try {
      const json = elem.getAttribute("product-data");
      const data = JSON.parse(json);
      const originalPrice = cleanPrice(
        ".price__old-price.price__old-price--exists"
      );
      return {
        itemId: data.id,
        title: data.itemName,
        currentPrice: data.stepPrice,
        originalPrice
      };
    } catch (e) {
      console.error("Could not find product info", e);
    }
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product-detail__cart");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
