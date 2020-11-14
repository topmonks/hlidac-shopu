import { html, svg, render } from "lit-html/lit-html.js";
import { classMap } from "lit-html/directives/class-map.js";
import { MDCTopAppBar } from "@material/top-app-bar/component.js";
import { Workbox } from "workbox-window/build/workbox-window.prod.mjs";
import { shops } from "@hlidac-shopu/lib/shops.js";
import {
  formatDate,
  formatMoney,
  formatPercents
} from "@hlidac-shopu/lib/format.js";
import { fetchDataSet, templateData } from "@hlidac-shopu/lib/remoting.js";
import "@hlidac-shopu/lib/chart.js";

const topAppBarElement = document.querySelector(".mdc-top-app-bar");
MDCTopAppBar.attachTo(topAppBarElement);

const root = document.getElementById("app-root");

const styles = document.createElement("link");
styles.rel = "stylesheet";
styles.href = "/assets/css/app.css";
document.head.insertAdjacentElement("beforeend", styles);

addEventListener("DOMContentLoaded", async () => {
  console.group("Hlídačshopů.cz");
  const sharedInfo = getSharedInfo(location);
  console.log("Shared data:", sharedInfo);
  if (sharedInfo) {
    document.body.classList.remove("home-screen");
    await renderResultsModal(sharedInfo.targetURL);
    performance.mark("UI ready");
  }
  console.groupEnd();
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
  return targetURL && { title, targetURL, shop };
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

function notFoundTemplate() {
  return html`
    <div
      id="hlidac-shopu-modal__not-found"
      class="hs-result mdc-layout-grid__inner"
    >
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <h2>Nenalezeno</h2>
      </div>
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 box box--purple"
      >
        <p>
          Je nám líto, ale hledaný produkt nebo e-shop nemáme v naší databázi.
        </p>
      </div>
    </div>
  `;
}

function loaderTemplate() {
  return html`
    <div
      id="hlidac-shopu-modal__loader"
      class="hs-result mdc-layout-grid__inner"
    >
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <h2>Ověřuji&hellip;</h2>
      </div>
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 box box--purple"
      >
        <div class="loading-container">
          <div class="loader" aria-label="Načítám data…">
            Váš požadavek se zpracovává&hellip;
          </div>
        </div>
      </div>
    </div>
  `;
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

  const discountTitle = x => {
    if (x > 0) {
      return "Podle nás sleva";
    } else if (x === 0) {
      return "Podle nás bez slevy";
    } else {
      return "Podle nás zdraženo";
    }
  };

  const discountClass = x => ({
    "hs-real-discount": true,
    "hs-real-discount--neutral": x === 0,
    "hs-real-discount--negative": x < 0
  });

  const ourDiscount = (x, discountType) =>
    x !== null && !isNaN(x)
      ? html`
          <div class="${classMap(discountClass(x))}">
            <b
              ><span
                >${x < 0 ? "↑" : x > 0 ? "↓" : "="}
                ${formatPercents(Math.abs(x))}</span
              ></b
            >
            <abbr title="${titles.get(discountType)}"
              >${discountTitle(x)}*</abbr
            >
          </div>
        `
      : null;
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
          ? html`<div class="claimed-price">
              ${discountType === "eu-minimum"
                ? "Minimální cena před akcí"
                : "Běžná cena"}
              <b
                >${discountType === "eu-minimum"
                  ? formatMoney(prices.minPrice)
                  : formatMoney(prices.commonPrice)}</b
              >
            </div>`
          : null}
        <div class="actual-price">
          Prodejní cena
          <span id="current-price">${formatMoney(actualPrice)}</span>
        </div>
        ${ourDiscount(discount, discountType)}
        ${claimedDiscount
          ? html`<div class="claimed-discount">
              Sleva udávaná e-shopem <b>${formatPercents(claimedDiscount)}</b>
            </div>`
          : null}
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <hs-chart .data="${data}"></hs-chart>
      </div>
    </div>
  `;
}

function logoTemplate({ logo, name, url, viewBox }) {
  const image = svg`
    <svg viewBox="${viewBox}">
      <title>${name}</title>
      <use href="#${logo}"></use>
    </svg>
  `;
  return html`
    <a
      href="${url}"
      class="sprite sprite--${logo}"
      title="${name}"
      target="_blank"
      rel="noopener noreferrer"
      >${image}</a
    >
  `;
}
