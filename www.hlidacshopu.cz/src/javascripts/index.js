import { html, svg, render } from "lit-html/lit-html.js";
import { shops } from "./lib/shops.js";
import { formatPercents, formatMoney } from "./lib/format.js";
import {
  initChart,
  fetchDownloadStats,
  fetchShopsStats,
  templateData
} from "./lib/remoting";

const form = document.getElementById("compare-form");
const eShops = document.getElementById("e-shopy");
const eShopsCount = document.getElementById("e-shops-count");
const productsCount = document.getElementById("products-count");
const installsCount = document.getElementById("installs-count");
const modal = document.getElementById("hlidac-shopu-modal");
const modalRenderRoot = document.getElementById(
  "hlidac-shopu-modal__placeholder"
);
const installationGuide = document.getElementById("extension-install-guide");
const chart = () => document.getElementById("hlidac-shopu-chart");

const haveToCloseModal = t =>
  t === modal ||
  t.classList.contains("modal__close") ||
  t.parentElement.classList.contains("modal__close");

form.addEventListener("submit", e => {
  e.preventDefault();
  const detailUri = e.target["url"].value;
  history.pushState(
    { showModal: true, detailUri },
    null,
    `?url=${encodeURIComponent(detailUri)}`
  );
  renderResultsModal(detailUri);
});

modal.addEventListener("click", e => {
  const target = e.target;
  if (haveToCloseModal(target)) {
    e.preventDefault();
    history.pushState({ showModal: false }, null, "/");
    hideResultsModal();
    clearAndFocusInput();
  }
});

addEventListener("keydown", e => {
  if (e.key === "Escape" && history.state && history.state.showModal) {
    history.pushState({ showModal: false }, null, "/");
    hideResultsModal();
    clearAndFocusInput();
  }
});

addEventListener("DOMContentLoaded", async e => {
  const searchParams = new URLSearchParams(location.search);
  if (searchParams.has("url")) {
    const detailUri = searchParams.get("url");
    history.replaceState({ showModal: true, detailUri }, null);
    renderResultsModal(detailUri);
  }
  render(eShopList(Array.from(shops.values())), eShops);
  const installationGuideUrl = getInstallationGuideUrl(searchParams);
  if (installationGuideUrl) {
    const client = await import(installationGuideUrl);
    render(client.installationGuide(), installationGuide);
  }
  eShopsCount.innerText = shops.size.toLocaleString("cs");
  fetchDownloadStats().then(
    x => (installsCount.innerText = x.downloads.toLocaleString("cs"))
  );
  fetchShopsStats()
    .then(xs => xs.reduce((acc, x) => acc + x.allProducts, 0))
    .then(x => (productsCount.innerText = x.toLocaleString("cs")));
});

addEventListener("popstate", e => {
  if (!history.state) {
    hideResultsModal();
    return;
  }
  const { showModal, detailUri } = history.state;
  if (showModal) {
    renderResultsModal(detailUri);
  } else {
    hideResultsModal();
  }
});

function clearAndFocusInput() {
  form["url"].value = "";
  form["url"].focus();
}

function showResultsModal() {
  modal.classList.remove("modal--hidden");
  document.body.classList.add("no-scroll");
}

function hideResultsModal() {
  modal.classList.add("modal--hidden");
  document.body.classList.remove("no-scroll");
}

async function renderResultsModal(detailUrl) {
  render(loaderTemplate(), modalRenderRoot);
  showResultsModal();
  try {
    const [{ plot }, chartData] = await initChart(detailUrl);
    render(resultTemplate(templateData(detailUrl, chartData)), modalRenderRoot);
    plot(chart(), chartData);
  } catch (ex) {
    console.error(ex);
    render(notFoundTemplate(), modalRenderRoot);
  }
}

// explicit map of URLs for guides, to be rev-updated in production build
const guides = new Map([
  ["firefox", "./firefox.js"],
  ["android", "./android.js"],
  ["chrome", "./chrome.js"],
  ["safari", "./safari.js"]
]);

function getInstallationGuideUrl(searchParams) {
  const browsers = Array.from(guides.keys());
  // forcing UA via get parameters has precedence
  let browser = browsers.filter(x => searchParams.has(x)).pop();
  if (!browser) {
    const ua = navigator.userAgent.toLowerCase();
    browser = browsers.filter(x => ua.indexOf(x) > 0).shift();
  }
  return guides.get(browser);
}

function notFoundTemplate() {
  return html`
    <div
      id="hlidac-shopu-modal__not-found"
      class="result mdc-layout-grid__inner"
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
    <div id="hlidac-shopu-modal__loader" class="result mdc-layout-grid__inner">
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
        Uváděná původní cena <del id="original-price">${formatMoney(x)}</del>
      </div>
    `;
  const realDiscount = x =>
    x !== null &&
    !isNaN(x) &&
    html`
      <div>
        <abbr
          title="Reálná sleva se počítá jako aktuální cena po slevě ku maximální ceně, za kterou se zboží prodávalo za posledních 90 dní."
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
    <div id="hlidac-shopu-modal__found" class="result mdc-layout-grid__inner">
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <h2>
          ${shopLogo(shops.get(shop))}<a href="${detailUrl}" id="product-name"
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
          <use href="#${logo}"/>
        </svg>`;
  return html`
    <a href="${url}" class="sprite sprite--${logo}" title="${name}">${image}</a>
  `;
}

function eShopList(shops) {
  return html`
    <ul>
      ${shops.map(x => html` <li>${logoTemplate(x)}</li> `)}
    </ul>
  `;
}
