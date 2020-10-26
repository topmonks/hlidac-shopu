import { html, svg, render } from "lit-html/lit-html.js";
import { MDCTopAppBar } from "@material/top-app-bar/component.js";
import { Workbox } from "workbox-window/build/workbox-window.prod.mjs";
import { shops } from "./lib/shops.js";
import { formatMoney, formatPercents } from "./lib/format.js";
import { initChart, templateData } from "./lib/remoting.js";

const topAppBarElement = document.querySelector(".mdc-top-app-bar");
const topAppBar = new MDCTopAppBar(topAppBarElement);

const root = document.getElementById("app-root");
const form = document.getElementById("compare-form");
const chart = () => document.getElementById("hlidac-shopu-chart");

addEventListener("DOMContentLoaded", async () => {
  console.group("Hlídačshopů.cz");
  const sharedInfo = getSharedInfo(location);
  console.log("Shared data:", sharedInfo);
  if (sharedInfo) {
    document.body.classList.remove("home-screen");
    renderResultsModal(sharedInfo.targetURL);
  }
  console.groupEnd();
});

const isProduction = () =>
  ["localhost", "127"].indexOf(location.hostname) === -1;

window.isUpdateAvailable = new Promise(async (resolve, reject) => {
  if ("serviceWorker" in navigator && isProduction()) {
    try {
      const wb = new Workbox("/sw.js");
      wb.addEventListener("installed", e => {
        console.log(
          "ServiceWorker registration successful with scope: ",
          e.sw.scope
        );
        resolve(e.isUpdate);
      });
      wb.addEventListener("activated", e => resolve(e.isUpdate));
      wb.addEventListener("controlling", e => resolve(e.isUpdate));
      wb.addEventListener("waiting", e => resolve(e.isUpdate));
      await wb.register();
    } catch (ex) {
      reject(ex);
    }
  }
});

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
  console.group("Hlídačshopů.cz");
  render(loaderTemplate(), root);
  try {
    const [{ plot }, chartData] = await initChart(detailUrl);
    console.log({ chartData })
    render(resultTemplate(templateData(detailUrl, chartData)), root);
    plot(chart(), chartData);
  } catch (ex) {
    console.error(ex);
    render(notFoundTemplate(), root);
  } finally {
    console.groupEnd();
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
  name,
  shop,
  lastDeclaredPrice,
  actualPrice,
  discount,
  date
}) {
  const declaredOriginalPrice = x =>
    x &&
    html`
      <div class="claimed-price">
        Uváděná původní cena
        <del id="original-price">${formatMoney(x)}</del>
      </div>
    `;
  const realDiscount = x =>
    x !== null &&
    !isNaN(x) &&
    html`
      <div>
        <abbr
          title="Reálná sleva se počítá podle EU směrnice jako aktuální cena po slevě ku minimální ceně, za kterou se zboží prodávalo v období 30 dní před slevovou akcí."
          >Reálná sleva*</abbr
        >
        <b class="discount"
          ><span id="real-discount">${formatPercents(x)}</span></b
        >
      </div>
    `;
  const crawlDate = x =>
    x &&
    html`
      <time id="latest-date" datetime="${x.toISOString()}">
        ${x.toLocaleString("cs", {
          day: "numeric",
          month: "long",
          year: "numeric"
        })}
      </time>
    `;
  const shopLogo = x => x && logoTemplate(x);
  return html`
    <div
      id="hlidac-shopu-modal__found"
      class="hs-result mdc-layout-grid__inner layout-wrapper"
    >
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <h2>
          ${shopLogo(shops.get(shop))}
          <a href="${detailUrl}" id="product-name"
            >${name || "Vámi vybraný produkt"}</a
          >
        </h2>
      </div>
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 box box--purple"
      >
        ${crawlDate(date)} ${declaredOriginalPrice(lastDeclaredPrice)}
        <div class="actual-price">
          Prodejní cena
          <span id="current-price">${formatMoney(actualPrice)}</span>
        </div>
        ${realDiscount(discount) || ""}
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <canvas id="hlidac-shopu-chart" width="100%"></canvas>
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <div style="display:flex;justify-content: flex-end">
          <div
            style="width:12px;height:12px;background-color:#5c62cd;border-radius:2px;margin-right:5px;margin-top:2px;"
          ></div>
          <span>Uváděná původní cena</span>
          <div
            style="width:12px;height:12px;background-color:#ff8787;border-radius:2px;margin: 2px 5px 0 8px;"
          ></div>
          <span>Prodejní cena</span>
        </div>
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
    <a href="${url}" class="sprite sprite--${logo}" title="${name}">${image}</a>
  `;
}
