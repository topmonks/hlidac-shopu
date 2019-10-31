/* global plot, GRAPH_ICON */

/* exported $ */
const $ = document.querySelector.bind(document);

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

function fetchData(url, itemId, title) {
  const URL_BASE = "https://api.hlidacshopu.cz/shop";
  const dataUrl = `${URL_BASE}?url=` + encodeURIComponent(url) + "&itemId=" + itemId + "&title=" + encodeURIComponent(title);

  return fetch(dataUrl).then(response => {
    if (!response.ok) {
      throw new Error("HTTP error, status = " + response.status);
    }
    return response.json();
  });
}

function* daysBetween(start, end) {
  const startDay = new Date(start.getTime());
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end.getTime());
  endDay.setHours(0, 0, 0, 0);
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

function createDataset(data) {
  const parseTime = s => {
    const d = new Date(s);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const dataMap = new Map(data.map(i => [parseTime(i.d).getTime(), i]));
  const dataset = {
    originalPrice: [],
    currentPrice: [],
  };
  let lastDay = data[0];
  for (const day of daysBetween(parseTime(data[0].d), parseTime(data[data.length - 1].d))) {
    let item = dataMap.get(day.getTime());
    if (!item) {
      item = lastDay;
    } else {
      lastDay = item;
    }
    dataset.originalPrice.push({ x: day, y: item.o === "" ? null : item.o });
    dataset.currentPrice.push({ x: day, y: item.c === "" ? null : item.c });
  }
  return dataset;
}

async function main() {
  const shopName = getShopName(window.location.href);
  const shop = window.shops[shopName];
  if (!shop) {
    console.error("No shop found");
    return;
  }
  shop.onDetailPage(async function() {
    try {
      const info = shop.getInfo();
      if (!info) {
        // no detail page
        return false;
      }

      const checkElem = document.querySelector("#hlidacShopu2-chart");
      if (checkElem) {
        return false;
      }
      const data = await fetchData(window.location.href, info.itemId, info.title);
      const dataset = createDataset(data);

      shop.insertChartElement(styles => chartWrapper(styles));
      const plotElem = document.querySelector("#hlidacShopu2-chart");

      console.log(`Graph loaded for ${info.itemId}`);
      plot(plotElem, dataset);
      return true;
    } catch (e) {
      console.error(e);
    }
  });
}

main().catch(err => console.error(err));
