import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

export default function mall() {
  dataStore.fetchData(window.location.href)
    .then(function (data) {
      var markup = chartWrapper();

      const elem = $(".price-wrapper");
      if (!elem) return;
      elem.after(markup);
      plot("pricesChart", ...data);
    });
}
