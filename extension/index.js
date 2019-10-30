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
    clear: "both",
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
          <span style="color:#939393;font-size:15px">Prodejní cena</span>
        </div>
      </div>
    </div>
    <canvas id="hlidacShopu2-chart" height="400" width="538"></canvas>
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
  const URL_BASE = "https://api.hlidacshopu.cz/shop";
  const dataUrl = `${URL_BASE}?url=` + encodeURIComponent(url) + "&itemId=" + itemId + "&dataType=" + dataType + "&title=" + encodeURIComponent(title);

  return fetch(dataUrl).then(response => {
    if (!response.ok) {
      throw new Error("HTTP error, status = " + response.status);
    }
    return response.json();
  });
}

function* daysBetween(start, end) {
  const startDay = new Date(start.getYear(), start.getMonth(), start.getDay());
  const endDay = new Date(end.getYear(), end.getMonth(), end.getDay());
  for (const d = startDay; d <= endDay; d.setDate(d.getDate() + 1)) {
    yield new Date(d.getTime());
  }
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

function stretchData(data) {
  const clearTime = d => new Date(d.getYear(), d.getMonth(), d.getDay());
  const dataMap = new Map(data.map(i => [clearTime(i.date).getTime(), i]));
  const final = [];
  let lastDay = data[0];
  for (const day of daysBetween(data[0].date, data[data.length - 1].date)) {
    let item = dataMap.get(day.getTime());
    if (!item) {
      item = lastDay;
    } else {
      lastDay = item;
    }
    const { originalPrice, currentPrice } = item;
    final.push({
      date: day,
      originalPrice,
      currentPrice,
    });
  }
  return final;
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
  const res = await fetchData(window.location.href, info.itemId, info.title, info.dataType);
  const data = res.map(item => ({
    date: new Date(item.d),
    originalPrice: item.o === "" ? null : item.o,
    currentPrice: item.c === "" ? null : item.c,
  }));

  const final = stretchData(data);
  console.log("final", final);

  shop.insertChartElement(styles => chartWrapper(styles));
  const plotElem = document.querySelector("#hlidacShopu2-chart");

  const dataset = {
    originalPrice: final.map(item => ({ x: item.date, y: item.originalPrice })),
    currentPrice: final.map(item => ({ x: item.date, y: item.currentPrice })),
  };
  console.log(dataset);
  plot(plotElem, dataset);
}

main().catch(err => console.error(err));
