/* global plot */

function chartWrapper(styles) {
  const basicStyles = "border: 1px solid lightgray; margin: 5px; padding: 5px;";
  const resultStyles = styles || basicStyles;

  const wrapperMarkup = `<div id="hlidacShopu" style="${resultStyles}">
    <canvas id="hlidacShopu-chart" height="400" width="538"></canvas>
    <small style="color:#939393">HlídačShopů by
      <a href="https://www.apify.com/" style="font-weight: bold; color:#5C62CD">Apify</a>,
      <a href="https://www.keboola.com" style="font-weight: bold; color:#5C62CD">Keboola</a>,
      and <a href="https://www.topmonks.com/" style="font-weight: bold; color:#5C62CD">TopMonks</a>
    </small>
  </div>`;
  return wrapperMarkup;
}

function fetchData(url, itemId, title, dataType) {
  const URL_BASE = "https://tok179mvhf.execute-api.eu-central-1.amazonaws.com/default/fetchData";
  const dataUrl = `${URL_BASE}?url=` + encodeURIComponent(url) + "&itemId=" + itemId + "&dataType=" + dataType + "&title=" + encodeURIComponent(title);

  return fetch(dataUrl).then(response => {
    if (!response.ok) {
      throw new Error("HTTP error, status = " + response.status);
    }
    return response.json();
  });
}

/**
 * Get shop name from 2nd level domain
 *
 * www.alza.cz => alza
 */
function getShopName(href) {
  const url = new URL(href);
  const domainParts = url.host.split(".");
  domainParts.pop();
  return domainParts.pop();
}

async function main() {
  const shopName = getShopName(window.location.href);
  const shop = window.shops[shopName];
  if (!shop) {
    console.error("No shop found");
    return;
  }
  const info = shop.getInfo();
  if (!info) {
    // no detail page
    return;
  }
  const data = await fetchData(window.location.href, info.itemId, info.title, info.dataType);
  shop.insertChartElement(styles => chartWrapper(styles));
  const plotElem = document.querySelector("#hlidacShopu-chart");
  plot(plotElem, data);
}

main().catch(err => console.error(err));
