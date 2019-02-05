function chartWrapper(styles) {
  const basicStyles = 'border: 1px solid lightgray; margin: 5px; padding: 5px;'
  const resultStyles = styles || basicStyles;

  const wrapperMarkup = `<div id="hlidacShopu" style="${resultStyles}">
    <canvas id="hlidacShopu-chart" height="400" width="538"></canvas>
    <small style="color:#d2d2d2">HlídačShopů by
      <a href="https://www.apify.com/" style="color:#a6a6a6">Apify</a>,
      <a href="https://www.keboola.com" style="color:#a6a6a6">Keboola</a>,
      and <a href="https://www.topmonks.com/" style="color:#a6a6a6">TopMonks</a>
    </small>
  </div>`;
  return wrapperMarkup;
}

export default chartWrapper
