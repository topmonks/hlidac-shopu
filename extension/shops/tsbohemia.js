
window.shops = window.shops || {};
window.shops['tsbohemia'] = {
  name: 'tsbohemia',

  getInfo() {
    const elem = $("#stoitem_detail");
    if (!elem) return;
    const itemId = $('.sti_detail_head').dataset.stiid;
    const title = $('h1');

    return { itemId, title};
  },

  insertChartElement(chartMarkup) {
    const elem = $('.sti_info');
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
