window.shops = window.shops || {};
window.shops['itesco'] = {
  name: 'itesco',

  getInfo() {
    const elem = $(".product-details-page");
    if (!elem) return;
    const href = window.location.href;
    const match = href.match(/(\d+)$/);
    var itemId = null;
    if (match && match[1]) {
      itemId = match[1];
    }
    const title = $('h1').textContent.trim();

    return {itemId, title};
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product-controls--wrapper");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    console.log(markup);
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
