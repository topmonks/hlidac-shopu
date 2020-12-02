import { html, render } from "lit-html/lit-html.js";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import { formatDate, formatMoney } from "@hlidac-shopu/lib/format.mjs";
import { fetchDataSet, templateData } from "@hlidac-shopu/lib/remoting.mjs";
import "@hlidac-shopu/lib/web-components/chart.mjs";
import {
  discountTemplate,
  loaderTemplate,
  notFoundTemplate,
  originalPriceTemplate
} from "@hlidac-shopu/lib/templates.mjs";

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
    x
      ? html`
          <time
            id="latest-date"
            datetime="${x.toISOString()}"
            title="Datum posledního čtení cen"
            >${formatDate(x)}
          </time>
        `
      : null;
  return html`
    <div class="hs-result">
      <div class="box box--purple">
        ${crawlDate(date)}
        ${discount !== 0
          ? originalPriceTemplate({ type: discountType, ...prices })
          : null}
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
