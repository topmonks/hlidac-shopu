// const $ = document.querySelector.bind(document);

window.shops = window.shops || {};
window.shops["czc"] = {
  name: "czc",

  getInfo() {
    const elem = $(".product-detail");
    if (!elem) return;
    const itemId = elem.dataset.productCode;
    const title = $('h1').getAttribute('title');

    return { itemId, title };
  },

  insertChartElement(chartMarkup) {
    const elem = $("#product-price-and-delivery-section");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
