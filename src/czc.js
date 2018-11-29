import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

var id = 'blah';

dataStore.getCzcData(id)
  .then(function (data) {
    var markup = chartWrapper();

    $("#product-price-and-delivery-section").after(markup);
    plot("pricesChart", ...data);
  });
