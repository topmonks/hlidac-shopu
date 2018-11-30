import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

var id = 'blah';

dataStore.getAlzaData(id)
  .then(function (data) {
    var styles = 'border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;';
    var markup = chartWrapper(styles);

    $("#pricec").after(markup);
    plot("pricesChart", ...data);
  });
