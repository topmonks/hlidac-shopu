import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

export default function alza() {
  console.log(window.location.href);

  const elem = $("#pricec");
  if (elem.length === 0) return;
  const styles = 'border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;';
  const markup = chartWrapper(styles);
  elem.after(markup);

  dataStore.fetchData(window.location.href)
    .then(function (data) {
      plot("pricesChart", ...data);
    });
}
