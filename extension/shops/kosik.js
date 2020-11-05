/* global cleanPrice */

let kosik_loaded = false;
let kosik_last_href = null;

const kosik = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== kosik_last_href) {
        kosik_loaded = false;
        kosik_last_href = window.location.href;
      }
      if (kosik_loaded) return;

      const detail = document.querySelector(".product-detail__main-info");
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
    const elem = document.querySelector(
      "#snippet-addProductToCartForm->.amount[product-data]"
    );
    if (!elem) return;
    try {
      const json = elem.getAttribute("product-data");
      const data = JSON.parse(json);
      const originalPrice = cleanPrice(
        ".price__old-price.price__old-price--exists"
      );
      const imageUrl = document.querySelector(".product-detail__image").src;

      return {
        itemId: data.id,
        title: data.itemName,
        currentPrice: data.stepPrice,
        originalPrice,
        imageUrl
      };
    } catch (e) {
      console.error("Could not find product info", e);
    }
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector(".product-detail__cart, .product-detail__cart-info");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};

window.shops = window.shops || {};
window.shops["kosik"] = kosik;
