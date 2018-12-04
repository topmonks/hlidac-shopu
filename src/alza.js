import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

export default function alza() {
  const elem = $("#pricec");
  if (elem.length === 0) return;
  const styles = 'border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;';
  const markup = chartWrapper(styles);
  elem.after(markup);

  const itemId = ($('#deepLinkUrl').attr('content').match(/\d+$/) || [])[0];
  const title = $('h1[itemprop="name"]').text().trim();

  dataStore.fetchData(window.location.href, itemId, title)
    .then(function (data) {
      plot("pricesChart", ...data);
    });
}
