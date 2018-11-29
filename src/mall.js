import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

var id = 'blah';

dataStore.getMallData(id)
  .then(function (data) {
    var markup = chartWrapper();

    $(".price-wrapper").after(markup);
    plot("pricesChart", ...data);
  });
