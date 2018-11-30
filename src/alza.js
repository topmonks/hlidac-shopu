import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

export default function alza() {
  console.log(window.location.href);

  dataStore.fetchData(window.location.href)
    .then(function (data) {
      var styles = 'border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;';
      var markup = chartWrapper(styles);

      const elem = $("#pricec");
      if (!elem) return;
      elem.after(markup);
      plot("pricesChart", ...data);
    });
}
