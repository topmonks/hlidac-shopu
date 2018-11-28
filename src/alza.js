import $ from 'jquery'
import plot from 'lib/plot'

$("#detailPicture").append('<div id="pricesChart" style="position:relative;width:1024px;margin-top:160px;"></div>');
plot("pricesChart", dates, originalPrices, currentPrices);

