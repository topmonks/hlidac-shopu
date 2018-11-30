import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

export default function czc() {
  const elem = $("#product-price-and-delivery-section");
  if (!elem) return;
  const markup = chartWrapper();
  elem.after(markup);

  dataStore.fetchData(window.location.href)
    .then(function (data) {
      plot("pricesChart", ...data);
    });
}
