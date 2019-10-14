// const $ = document.querySelector.bind(document);

window.shops = window.shops || {};
window.shops["lekarna"] = {
  name: "lekarna",

  getInfo() {
    const elem = $(".detail-top");
    if (!elem) return;
    const itemId = $('.product__code span').textContent.trim();
    const title = $('h1').textContent.trim();

    return { itemId, title, dataType: 'dynamo' };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product__price-and-form");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
