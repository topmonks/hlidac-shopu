import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'

var id = 'blah';

dataStore.getMallData(id)
  .then(function (data) {
    var markup = '<div id="hlidacShopu" style="border: 1px solid lightgray; margin: 5px; padding: 5px;"><h5>Hlídač shopů</h5><div id="pricesChart"></div><p>Created by Apify, Keboola, TopMonks</p></div>';

    $(".price-wrapper").after(markup);
    plot("pricesChart", ...data);
  });
