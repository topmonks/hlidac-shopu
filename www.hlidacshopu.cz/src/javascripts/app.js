import { html, svg, render } from "lit-html/lit-html.js";
import { classMap } from "lit-html/directives/class-map.js";
import { MDCTopAppBar } from "@material/top-app-bar/component.js";
import { Workbox } from "workbox-window/build/workbox-window.prod.mjs";
import { shops } from "./lib/shops.js";
import { formatDate, formatMoney, formatPercents } from "./lib/format.js";
import { initChart, templateData } from "./lib/remoting.js";

const topAppBarElement = document.querySelector(".mdc-top-app-bar");
MDCTopAppBar.attachTo(topAppBarElement);

const root = document.getElementById("app-root");
const chart = () => document.getElementById("hlidac-shopu-chart");

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
    const [{ plot }, chartData] = await initChart(detailUrl);
    console.log(chartData);
    render(resultTemplate(templateData(detailUrl, chartData)), root);
    plot(chart(), chartData);
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
      return "Reálná sleva";
    } else if (x === 0) {
      return "Reálně bez slevy";
    } else {
      return "Reálně zdraženo";
    }
  };

  const discountClass = x => ({
    "hs-real-discount": true,
    "hs-real-discount--neutral": x === 0,
    "hs-real-discount--negative": x < 0
  });

  const realDiscount = (x, discountType) =>
    x !== null &&
    !isNaN(x) &&
    html`
      <div class=${classMap(discountClass(x))}>
        <b><span>${formatPercents(x)}</span></b>
        <abbr title="${titles.get(discountType)}">${discountTitle(x)}*</abbr>
      </div>
    `;
  const crawlDate = x =>
    x
      ? html`
          <time
            id="latest-date"
            datetime="${x.toISOString()}"
            title="Datum posledního čtení cen"
            >${formatDate(x)}</time
          >
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
                : "Běžná cena před akcí"}
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
        ${realDiscount(discount, discountType) || null}
        ${claimedDiscount
          ? html`<div class="claimed-discount">
              Sleva udávaná e-shopem <b>${formatPercents(claimedDiscount)}</b>
            </div>`
          : null}
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <div style="display:flex;justify-content: flex-end;font-size: 12px">
          <div
            style="width:12px;height:12px;background-color:#5c62cd;border-radius:2px;margin-right:5px;margin-top:2px;"
          ></div>
          <span>Uváděná původní cena</span>
          <div
            style="width:12px;height:12px;background-color:#ff8787;border-radius:2px;margin: 2px 5px 0 8px;"
          ></div>
          <span>Prodejní cena</span>
        </div>
        <canvas id="hlidac-shopu-chart" width="100%"></canvas>
      </div>
    </div>
  `;
}

function logoTemplate({ logo, name, url, viewBox }) {
  const image = svg`
    <svg viewBox="${viewBox}">
      <title>${name}</title>
      <use href='#${logo}'></use>
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
