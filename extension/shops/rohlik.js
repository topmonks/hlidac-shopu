
window.shops = window.shops || {};
window.shops['rohlik'] = {
  name: 'rohlik',

  getInfo() {
    const elem = $("#productDetail");
    if (!elem) return;
    const divAmount = $('.AmountCounter');
    const itemId = divAmount.childNodes[0].dataset.productId;
    const title = document.title.split('-');
    const t = title[0].trim();

    return { itemId, t};
  },

  insertChartElement(chartMarkup) {
    const elem = $('.AmountCounter');
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
