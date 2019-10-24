/* global plot, GRAPH_ICON */

function _objToCss(obj) {
  return Object.entries(obj).map(([key, value]) => `${key}:${value};`).join("");
}

function chartWrapper(styles) {
  const basicStyles = {
    "background-color": "#fff",
    border: "1px solid #E8E8E8",
    "border-radius": "18px",
    margin: "5px",
    padding: "5px",
  };
  const resultStyles = _objToCss(Object.assign({}, basicStyles, styles));

  const wrapperMarkup = `<div id="hlidacShopu" style="${resultStyles}">
    <div style="display:flex;margin:23px 32px;align-items:center">
      <div style="padding-top:4px">
        ${GRAPH_ICON}
      </div>
      <div style="display:flex;flex-direction:column;margin-left:20px">
        <div style="line-height:20px;font-size:17px">Vývoj skutečné a uváděné původní ceny</div>
        <div style="display:flex">
          <div style="width:12px;height:12px;background-color:#5C62CD;border-radius:2px;margin-right:5px;margin-top:2px"></div>
          <span style="color:#939393;font-size:15px">Uváděná původní cena</span>
          <div style="width:12px;height:12px;background-color:#FF8787;border-radius:2px;margin:0 5px 0 8px;margin-top:2px"></div>
          <span style="color:#939393;font-size:15px">Skutečná cena</span>
        </div>
      </div>
    </div>
    <canvas id="hlidacShopu-chart" height="400" width="538"></canvas>
    <div style="font-size:10px;color:#BEBEBE;margin-bottom:15px;margin-right:33px;text-align:right">
      HlídačShopů by
      <a href="https://www.apify.com/" style="font-weight: bold; color:#757575">Apify</a>,
      <a href="https://www.keboola.com" style="font-weight: bold; color:#757575">Keboola</a>,
      and <a href="https://www.topmonks.com/" style="font-weight: bold; color:#757575">TopMonks</a>
    </div>
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
  data.forEach(item => {
    item.date = new Date(item.date);
  });
  shop.insertChartElement(styles => chartWrapper(styles));
  const plotElem = document.querySelector("#hlidacShopu-chart");
  // data.splice(10, 0, {date: new Date("2019-01-08"), currentPrice: null, originalPrice: null });
  // console.log(data);
  const dataset = {
    originalPrice: data.map(item => ({ x: item.date, y: item.originalPrice })),
    currentPrice: data.map(item => ({ x: item.date, y: item.currentPrice })),
  };
  plot(plotElem, dataset);
}

main().catch(err => console.error(err));
