import { formatDate, formatMoney } from "@hlidac-shopu/lib/format.mjs";
import { fetchDataSet, templateData } from "@hlidac-shopu/lib/remoting.mjs";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { html, render } from "lit-html";
import "@hlidac-shopu/lib/web-components/chart.mjs";
import { discountTemplate, notFoundTemplate, originalPriceTemplate, when } from "@hlidac-shopu/lib/templates.mjs";
import * as rollbar from "./rollbar.js";

rollbar.init();

if (typeof ResizeObserver === "undefined") {
  const polyfill = document.createElement("script");
  polyfill.src = "https://cdn.jsdelivr.net/npm/resize-observer-polyfill@1.5.1/dist/ResizeObserver.min.js";
  document.head.insertAdjacentElement("beforeend", polyfill);
}

const root = document.getElementById("app-root");

addEventListener("DOMContentLoaded", async () => {
  const sharedInfo = getSharedInfo(location);
  if (sharedInfo) {
    await renderResultsModal(sharedInfo.targetURL, false);
  }
});

function getTargetURL(searchParams) {
  const targetURL = searchParams.get("url") || searchParams.get("text");
  return targetURL && targetURL.trim().split(" ").pop();
}

function getShop(targetURL) {
  if (!targetURL) return null;
  return shopName(targetURL);
}

function getSharedInfo(location) {
  const { searchParams } = new URL(location);
  const targetURL = getTargetURL(searchParams);
  const title = searchParams.get("title");
  const shop = getShop(targetURL);
  const view = searchParams.get("view");
  return targetURL && { title, targetURL, shop, view };
}

async function renderResultsModal(detailUrl) {
  render(loaderTemplate(), root);
  try {
    const chartData = await fetchDataSet(detailUrl);
    console.log(chartData);
    render(resultTemplate(templateData(detailUrl, chartData)), root);
  } catch (ex) {
    console.error(ex);
    render(notFoundTemplate(), root);
  }
}

function resultTemplate({
  detailUrl,
  imageUrl,
  name,
  shop,
  lastDeclaredPrice,
  actualPrice,
  claimedDiscount,
  discount,
  discountType,
  date,
  data,
  ...prices
}) {
  const crawlDate = x =>
    when(
      x,
      () => html`
        <time
          id="latest-date"
          datetime="${x.toISOString()}"
          title="Datum posledního čtení cen"
          >${formatDate(x)}
        </time>
      `
    );
  return html`
    <div class="hs-result">
      <div class="box box--purple">
        ${crawlDate(date)}
        ${when(discount !== 0, () => originalPriceTemplate({ type: discountType, ...prices }))}
        <div class="hs-actual-price">
          Prodejní cena
          <span id="current-price">${formatMoney(actualPrice)}</span>
        </div>
        ${discountTemplate(
          {
            realDiscount: discount,
            type: discountType,
            claimedDiscount
          },
          true
        )}
      </div>
      <div class="">
        <hs-chart .data="${data}"></hs-chart>
      </div>
    </div>
  `;
}

function loaderTemplate() {
  return html`
    <div class="hs-result">
      <div class="">
        <h2>Ověřuji&hellip;</h2>
      </div>
      <div class="box box--purple">
        <div class="loading-container">
          <div class="loader" aria-label="Načítám data…">
            Váš požadavek se zpracovává&hellip;
            <div class="spinner">
              <div class="bar bar1"></div>
              <div class="bar bar2"></div>
              <div class="bar bar3"></div>
              <div class="bar bar4"></div>
              <div class="bar bar5"></div>
              <div class="bar bar6"></div>
              <div class="bar bar7"></div>
              <div class="bar bar8"></div>
              <div class="bar bar9"></div>
              <div class="bar bar10"></div>
              <div class="bar bar11"></div>
              <div class="bar bar12"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
