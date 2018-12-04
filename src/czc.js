import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

export default function czc() {
  const elem = $("#product-price-and-delivery-section");
  if (elem.length === 0) return;
  const markup = chartWrapper();
  elem.after(markup);

  const itemId = $('span[itemprop="sku"]').text().replace('a', '');
  const title = $('h1[title~="Název"]').clone().children().remove().end().text().trim();

  dataStore.fetchData(window.location.href, itemId, title)
    .then(function (data) {
      plot("pricesChart", ...data);
    });
}
