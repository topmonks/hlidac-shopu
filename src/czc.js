import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

export default function czc() {
  dataStore.fetchData(window.location.href)
    .then(function (data) {
      var markup = chartWrapper();

      const elem = $("#product-price-and-delivery-section");
      if (!elem) return;
      elem.after(markup);
      plot("pricesChart", ...data);
    });
}
