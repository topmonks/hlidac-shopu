/* global plot, GRAPH_ICON */

/* exported $ */
const $ = document.querySelector.bind(document);
const cleanPrice = s => {
  const el = document.querySelector(s);
  if (!el) return null;
  return el.textContent
    .replace("cca", "")
    .replace("včetně DPH", "")
    .replace("Kč", "")
    .replace(",-", "")
    .replace(",", ".")
    .replace(/\s+/g, "");
};

function _objToCss(obj) {
  return Object.entries(obj)
    .map(([key, value]) => `${key}:${value};`)
    .join("");
}

function chartWrapper(styles) {
  const basicStyles = {
    "background-color": "#fff",
    border: "1px solid #E8E8E8",
    "border-radius": "14px",
    margin: "16px 0",
    padding: "16px",
    clear: "both"
  };
  const resultStyles = _objToCss(Object.assign({}, basicStyles, styles));

  const wrapperMarkup = `
    <div id="hlidacShopu" style="${resultStyles}">
      <style>
        #hlidacShopu .hs-header {
          background: #fff;
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          position: static;
          width: initial;
        }
        #hlidacShopu .hs-header .hs-h4 {
          margin: 0;
          color: #000;
          font-size: 14px;
          line-height: 20px;
          font-weight: 400;
        }
        #hlidacShopu .hs-footer {
          display: flex;
          justify-content: space-between;
          padding-bottom: initial;
          margin-bottom: initial;
          background: initial;
          width: initial;
        }
        #hlidacShopu .hs-footer div {
          font-size: 10px;
          color: #979797;
        }
        #hlidacShopu .hs-footer a {
          color: #545FEF;
        }
        #hlidacShopu .hs-legend {
          display: flex;
          line-height: 28px;
          align-items: center;
          color: #939393;
          font-size: 13px;
          margin: initial;
        }
        #hlidacShopu .hs-real-discount {
          background-color: #FFE607;
          color: #1D3650;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          line-height: 16px;
          padding: 6px 10px 2px;
        }
      </style>
      <div class="hs-header">
        <div>${GRAPH_ICON}</div>
        <div>
          <div class="hs-h4">Vývoj skutečné a uváděné původní ceny</div>
          <div class="hs-legend">
            <div style="width:12px;height:12px;background-color:#5C62CD;border-radius:2px;margin-right:5px"></div>
            <span>Uváděná původní cena</span>
            <div style="width:12px;height:12px;background-color:#FF8787;border-radius:2px;margin: 0 5px 0 10px"></div>
            <span>Prodejní cena</span>
          </div>
        </div>
        <div class="hs-real-discount">
          <abbr title="Reálná sleva se počítá jako aktuální cena po slevě ku maxímální ceně, za kterou se zboží prodávalo za posledních 90 dní.">Reálná sleva*</abbr>
          <br><span id="hlidacShopu2-discount"></span>
        </div>
      </div>
      <canvas id="hlidacShopu2-chart" height="400" width="538"></canvas>
      <div class="hs-footer">
        <div>Více informací na <a href="https://www.hlidacshopu.cz/">HlídačShopů.cz</a></div>
        <div>Vytvořili
          <a href="https://www.apify.com/">Apify</a>,
          <a href="https://www.keboola.com/">Keboola</a>
          &amp; <a href="https://www.topmonks.com/">TopMonks</a>
        </div>
      </div>
    </div>
  `;
  return wrapperMarkup;
}

function fetchData(url, itemId, title, originalPrice, currentPrice) {
  const searchString = new URLSearchParams({
    metadata: 1,
    url,
    itemId,
    title,
    originalPrice,
    currentPrice
  });
  return fetch(`https://api.hlidacshopu.cz/shop?${searchString}`).then(
    response => {
      if (response.status === 404) {
        return response.json();
      }
      if (!response.ok) {
        throw new Error("HTTP error, status = " + response.status);
      }
      return response.json();
    }
  );
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
    currentPrice: []
  };
  let lastDay = data[0];
  for (const day of daysBetween(
    parseTime(data[0].d),
    parseTime(data[data.length - 1].d)
  )) {
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

const formatPercents = x => `${Math.round(x && (-1 * x)).toLocaleString("cs")} %`;
const createDataPoint = ({ originalPrice, currentPrice }) => ({
  c: currentPrice,
  o: originalPrice,
  d: new Date().toISOString()
});

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

      const checkElem = document.getElementById("hlidacShopu2-chart");
      if (checkElem) {
        return false;
      }
      const url = info.url || window.location.href;
      const res = await fetchData(
        url,
        info.itemId,
        info.title,
        info.originalPrice,
        info.currentPrice
      );
      if (res.metadata.error) {
        console.log("Error fetching data: ", res.metadata.error);
        return false;
      }
      if (res.data.length === 0) {
        console.log("No data found:", res);
        return false;
      }
      // Inject our HTML code
      shop.insertChartElement(styles => chartWrapper(styles));

      const discountEl = document.getElementById("hlidacShopu2-discount");
      const discount = res.metadata["real_sale"];
      if (discount !== "null") {
        discountEl.innerText = formatPercents(parseFloat(discount));
      } else {
        discountEl.parentElement.classList.add("discount--no-data");
      }
      res.data.push(createDataPoint(info));
      const dataset = createDataset(res.data);
      const plotElem = document.getElementById("hlidacShopu2-chart");

      console.log(`Graph loaded for ${info.itemId}`, { info, res });
      plot(plotElem, dataset);
      return true;
    } catch (e) {
      console.error(e);
    }
  });
}

main().catch(err => console.error(err));
