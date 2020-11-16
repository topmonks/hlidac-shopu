import { html, svg, render } from "lit-html/lit-html.js";
import { shops } from "@hlidac-shopu/lib/shops.js";
import {
  fetchDownloadStats,
  fetchShopsStats
} from "@hlidac-shopu/lib/remoting.js";
import { Workbox } from "workbox-window";

const isProduction = () =>
  ["localhost", "127"].indexOf(location.hostname) === -1;
if ("serviceWorker" in navigator && isProduction()) {
  const wb = new Workbox("/sw.js");
  wb.register();
}

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
  render(eShopList(Array.from(shops.values()).filter(x => x.viewBox)), eShops);
  const installationGuideUrl = getInstallationGuideUrl(searchParams);
  if (installationGuideUrl) {
    const client = await import(installationGuideUrl);
    render(client.installationGuide(), installationGuide);
  }
  eShopsCount.innerText = shops.size.toLocaleString("cs");
  fetchDownloadStats()
    .then(x => (installsCount.innerText = x.downloads.toLocaleString("cs")))
    .catch(ex => console.warn(ex));
  fetchShopsStats()
    .then(xs => xs.reduce((acc, x) => acc + x.allProducts, 0))
    .then(x => (productsCount.innerText = x.toLocaleString("cs")))
    .catch(ex => console.warn(ex));
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
  render(resultsEmbed(detailUrl), modalRenderRoot);
  showResultsModal();
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

function resultsEmbed(url) {
  const parameters = new URLSearchParams({ url, embed: "1" }).toString();
  return html` <iframe
    class="hs-result__embed"
    src="/app/?${parameters}"
  ></iframe>`;
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
