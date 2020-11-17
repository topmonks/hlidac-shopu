import { html, render } from "lit-html/lit-html.js";
import { MDCTopAppBar } from "@material/top-app-bar/component.js";
import { Workbox } from "workbox-window/build/workbox-window.prod.mjs";
import { shops } from "@hlidac-shopu/lib/shops.js";
import { formatDate, formatMoney } from "@hlidac-shopu/lib/format.js";
import { fetchDataSet, templateData } from "@hlidac-shopu/lib/remoting.js";
import "@hlidac-shopu/lib/web-components/chart.js";
import {
  claimedDiscountTemplate,
  discountTemplate,
  loaderTemplate,
  logoTemplate,
  notFoundTemplate,
  originalPriceTemplate
} from "@hlidac-shopu/lib/templates.mjs";

registerStylesheet("/assets/css/app.css");
registerStylesheet("https://fonts.googleapis.com/icon?family=Material+Icons");

const topAppBarElement = document.querySelector(".mdc-top-app-bar");
MDCTopAppBar.attachTo(topAppBarElement);

const root = document.getElementById("app-root");
const toolbar = document.getElementById("toolbar");
const shareButton = document.getElementById("share-button");
const searchButton = document.getElementById("search-button");

addEventListener("DOMContentLoaded", async () => {
  console.group("Hlídačshopů.cz");
  const sharedInfo = getSharedInfo(location);
  console.log("Shared data:", sharedInfo);
  if (sharedInfo) {
    root.parentElement.classList.remove("home-screen");
    await renderResultsModal(sharedInfo.targetURL);
    performance.mark("UI ready");
  }
  if (!navigator.share) {
    shareButton.style.display = "none";
  }
  if (sharedInfo.embed) {
    toolbar.classList.remove("toolbar--visible");
  }
  console.groupEnd();
});

shareButton.addEventListener("click", () => {
  if (!navigator.share) return false;
  navigator.share({ url: "", title: "Hlídač shopů" });
});

searchButton.addEventListener("click", () => {
  location.assign("/app/");
});

const isProduction = () =>
  ["localhost", "127"].indexOf(location.hostname) === -1;

if ("serviceWorker" in navigator && isProduction()) {
  try {
    const wb = new Workbox("/sw.js");
    wb.addEventListener("installed", e => {
      console.log(
        "ServiceWorker registration successful with scope: ",
        e.sw.scope
      );
    });
    // TODO: implement SW states
    // wb.addEventListener("activated", e => resolve(e.isUpdate));
    // wb.addEventListener("controlling", e => resolve(e.isUpdate));
    // wb.addEventListener("waiting", e => resolve(e.isUpdate));
    wb.register();
  } catch (ex) {}
}

function getTargetURL(searchParams) {
  const targetURL = searchParams.get("url") || searchParams.get("text");
  return targetURL && targetURL.trim().split(" ").pop();
}

function getShop(targetURL) {
  if (!targetURL) return null;
  const shop = targetURL.split(".");
  shop.pop();
  return shop.pop();
}

function getSharedInfo(location) {
  const { searchParams } = new URL(location);
  const targetURL = getTargetURL(searchParams);
  const title = searchParams.get("title");
  const shop = getShop(targetURL);
  const embed = searchParams.get("embed");
  return targetURL && { title, targetURL, shop, embed };
}

async function renderResultsModal(detailUrl) {
  render(loaderTemplate(), root);
  try {
    const chartData = await fetchDataSet(detailUrl);
    console.log(chartData);
    toolbar.classList.toggle("toolbar--visible");
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
  const shopLogo = x => x && logoTemplate(x);
  return html`
    <div
      id="hlidac-shopu-modal__found"
      class="hs-result mdc-layout-grid__inner layout-wrapper"
    >
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <h2>
          ${shopLogo(shops.get(shop))}
          <a
            href="${detailUrl}"
            id="product-name"
            class="product-name"
            target="_blank"
            rel="noopener noreferrer"
          >${name || "Vámi vybraný produkt"}</a
          >
          ${imageUrl ? html`<img alt="${name}" src="${imageUrl}" />` : null}
        </h2>
      </div>
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 box box--purple"
      >
        ${crawlDate(date)}
        ${discount !== 0
          ? originalPriceTemplate({ type: discountType, ...prices })
          : null}
        <div class="hs-actual-price">
          Prodejní cena
          <span id="current-price">${formatMoney(actualPrice)}</span>
        </div>
        ${discountTemplate({ realDiscount: discount, type: discountType })}
        ${claimedDiscount ? claimedDiscountTemplate(claimedDiscount) : null}
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <hs-chart .data="${data}"></hs-chart>
      </div>
    </div>
  `;
}

function registerStylesheet(href) {
  const styles = document.createElement("link");
  styles.rel = "stylesheet";
  styles.href = href;
  document.head.insertAdjacentElement("beforeend", styles);
}
