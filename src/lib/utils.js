function chartWrapper(styles) {
  var basicStyles = 'border: 1px solid lightgray; margin: 5px; padding: 5px;'
  var resultStyles = styles || basicStyles;

  var wrapperMarkup = '<div id="hlidacShopu" style="' + resultStyles + '"><div id="pricesChart"></div><p>HlídačShopů by <a href="https://www.apify.com/">Apify</a>, <a href="https://www.keboola.com">Keboola</a>, and <a href="https://www.topmonks.com/">TopMonks</a></p></div>';
  return wrapperMarkup;
}

export default chartWrapper
