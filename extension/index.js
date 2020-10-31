/* global plot, GRAPH_ICON */

/* exported cleanPrice */
function cleanPrice(s) {
  const el = typeof s === "string" ? document.querySelector(s) : s;
  if (!el) return null;
  const priceText = el.textContent.replace(/\s+/g, "");
  const match = priceText.match(/\d+(:?[,.]\d+)?/);
  if (!match) return null;
  return match[0].replace(",", ".");
}

/* exported registerShop */
function registerShop(shop, ...names) {
  window.shops = window.shops || {};
  for (let name of names) {
    window.shops[name] = shop;
  }
}

const toCssString = obj =>
  Object.entries(obj)
    .map(([key, value]) => `${key}:${value};`)
    .join("");

function chartWrapper(styles) {
  const basicStyles = {
    "background-color": "#fff",
    "border": "1px solid #E8E8E8",
    "border-radius": "14px",
    "margin": "16px 0",
    "padding": "16px",
    "clear": "both"
  };
  const resultStyles = toCssString(Object.assign({}, basicStyles, styles));
  const url = location.toString();
  const permalink = `https://www.hlidacshopu.cz/app/?url=${encodeURIComponent(
    url
  )}`;
  return `
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
        #hlidacShopu .hs-header > :first-child {
          flex-grow: 2;
        }
        #hlidacShopu .hs-header .hs-logo {
          margin-right: 16px;
          float: left;
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
          flex-flow: wrap;
          line-height: 20px;
          align-items: center;
          color: #939393;
          font-size: 13px;
          margin: initial;
        }
        #hlidacShopu .hs-legend__item {
          margin-right: 10px;
        }
        #hlidacShopu .hs-legend__item-color {
          display:inline-block;
          width:12px;
          height:12px;
          border-radius:2px;
          margin-right:5px;
        }
        #hlidacShopu .hs-real-discount {
          align-self: flex-start;
          background-color: #FFE607;
          color: #1D3650;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          line-height: 16px;
          padding: 6px 10px 6px;
          margin-left: 16px;
        }
        #hlidacShopu .hs-real-discount.hs-real-discount--negative {
            background-color: #ca0505;
            color: #fff;
        }
        #hlidacShopu .hs-real-discount.hs-real-discount--no-data {
            display: none;
        }
      </style>
      <div class="hs-header">
        <div>
          <a class="hs-logo"
            href="${permalink}"
             title="trvalý odkaz na vývoj ceny">
            ${GRAPH_ICON}
          </a>
          <div class="hs-h4">Vývoj skutečné a uváděné původní ceny</div>
          <div class="hs-legend">
            <div class="hs-legend__item">
              <span class="hs-legend__item-color" style="background-color:#5C62CD"></span>
              <span>Uváděná původní cena</span>
            </div>
            <div class="hs-legend__item">
              <span class="hs-legend__item-color" style="background-color:#FF8787"></span>
              <span>Prodejní cena</span>
            </div>
          </div>
        </div>
        <div class="hs-real-discount">
          <abbr title="Reálná sleva se počítá jako aktuální cena po slevě ku maxímální ceně, za kterou se zboží prodávalo za posledních 90 dní.">Reálná sleva*</abbr>
          <br><span id="hlidacShopu2-discount"></span>
        </div>
      </div>
      <div id="hlidacShopu2-chart-container">
        <canvas id="hlidacShopu2-chart" width="538" height="400"></canvas>
      </div>
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
}

function fetchData(url, itemId, title, originalPrice, currentPrice) {
  const searchString = new URLSearchParams({
    url,
    itemId,
    title,
    originalPrice,
    currentPrice
  });
  return fetch(`https://api2.hlidacshopu.cz/detail?${searchString}`).then(
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
 *
 * Slovak domains adds _sk
 * www.alza.sk => alza_sk
 */
function getShopName(href) {
  const url = new URL(href);
  const domainParts = url.host.split(".");
  const domain = domainParts.pop();
  let shopName = domainParts.pop();
  if (domain !== "cz") {
    return `${shopName}_${domain}`;
  }
  return shopName;
}

function getCurrency(shopName) {
  if (shopName.endsWith("sk")) {
    return "€";
  }
  return "Kč";
}

const formatPercents = x => `${Math.round(x * 100).toLocaleString("cs")} %`;
const createDataPoint = ({ originalPrice, currentPrice }) => ({
  c: currentPrice,
  d: new Date().toISOString().substring(0, 10),
  o: originalPrice || ""
});

function discount(previous, actual) {
  if (!previous || isNaN(previous)) return null;
  return (previous - actual) / previous;
}
const realDiscount = ({ realDiscount, minPrice, commonPrice }, currentPrice) =>
  discount(minPrice ?? commonPrice, currentPrice) ?? realDiscount;

/* eslint-disable no-console */
async function main() {
  console.group("Hlídačshopů.cz");
  const shopName = getShopName(location.href);
  const shop = window.shops[shopName];
  if (!shop) {
    console.log("No shop found");
    return;
  }
  shop.onDetailPage(async repaint => {
    try {
      const info = await Promise.resolve(shop.getInfo());
      if (!info) {
        // no detail page
        return false;
      }

      const checkElem = document.getElementById("hlidacShopu2-chart");
      if (checkElem && !repaint) {
        return false;
      }
      const url = info.url || location.href;
      const res = await fetchData(
        url,
        info.itemId,
        info.title,
        info.originalPrice,
        info.currentPrice
      );
      if (res.metadata.error) {
        console.error("Error fetching data: ", res.metadata.error);
        return false;
      }
      if (res.data.length === 0) {
        console.error("No data found:", res);
        return false;
      }
      // Inject our HTML code
      if (repaint) {
        // remove canvas to delete and clear previous chart
        document.getElementById("hlidacShopu2-chart").remove();
        const container = document.getElementById(
          "hlidacShopu2-chart-container"
        );
        const newCanvas = document.createElement("canvas");
        newCanvas.id = "hlidacShopu2-chart";
        container.appendChild(newCanvas);
      } else {
        shop.insertChartElement(styles => chartWrapper(styles));
      }

      const titles = new Map([
        [
          "eu-minimum",
          "Reálná sleva se počítá podle EU směrnice jako aktuální cena po slevě ku minimální ceně, za kterou se zboží prodávalo v období 30 dní před slevovou akcí."
        ],
        [
          "common-price",
          "Počítá se jako aktuální cena ku nejčastější ceně, za kterou se zboží prodávalo za posledních 90 dnů."
        ]
      ]);
      const discountEl = document.getElementById("hlidacShopu2-discount");
      const parentElement = discountEl.parentElement;
      const abbr = parentElement.querySelector("abbr");
      const discount = realDiscount(res.metadata, parseFloat(info.currentPrice));
      abbr.title = titles.get(res.metadata.type);
      if (discount != null && discount < 0) {
        parentElement.classList.add("hs-real-discount--negative");
        abbr.textContent = "Reálně zdraženo";
        discountEl.innerText = "";
      } else if (discount != null) {
        discountEl.innerText = formatPercents(discount);
      } else {
        discountEl.parentElement.classList.add("hs-real-discount--no-data");
      }

      if (info.currentPrice) {
        res.data.currentPrice.push({
          x: new Date().toISOString(),
          y: parseFloat(info.currentPrice)
        });
      }
      if (info.originalPrice) {
        res.data.originalPrice.push({
          x: new Date().toISOString(),
          y: parseFloat(info.originalPrice)
        });
      }

      const dataset = Object.assign({}, res.data, {
        currency: getCurrency(shopName)
      });
      const plotElem = document.getElementById("hlidacShopu2-chart");

      console.log(`Chart loaded for ItemID: ${info.itemId}`);
      console.log({ info, metadata: res.metadata, dataset });
      plot(plotElem, dataset);
      console.log(
        `https://www.hlidacshopu.cz/app/?${new URLSearchParams({
          url: location.href,
          itemId: info.itemId,
          debug: 1
        })}`
      );
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      console.groupEnd();
    }
  });
}

main().catch(err => console.error(err));
