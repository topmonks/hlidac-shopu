import { html, render } from "lit-html/lit-html.js";
import { MDCTopAppBar } from "@material/top-app-bar/component.js";
import { MDCSnackbar } from "@material/snackbar/component.js";
import {
  Workbox,
  messageSW
} from "workbox-window/build/workbox-window.prod.mjs";
import { shopName, shops } from "@hlidac-shopu/lib/shops.mjs";
import { formatDate, formatMoney } from "@hlidac-shopu/lib/format.mjs";
import { fetchDataSet, templateData } from "@hlidac-shopu/lib/remoting.mjs";
import "@hlidac-shopu/lib/web-components/chart.mjs";
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
const snackbarElement = document.querySelector(".mdc-snackbar");
const snackbar = MDCSnackbar.attachTo(snackbarElement);

const root = document.getElementById("app-root");
const toolbar = document.getElementById("toolbar");
const shareButton = document.getElementById("share-button");
const searchButton = document.getElementById("search-button");
const progressBar = document.querySelector(".hs-progress-bar");

addEventListener("DOMContentLoaded", async () => {
  console.group("Hlídačshopů.cz");
  const sharedInfo = getSharedInfo(location);
  console.log("Shared data:", sharedInfo);
  if (sharedInfo) {
    root.parentElement.classList.remove("home-screen");
    await renderResultsModal(sharedInfo.targetURL, sharedInfo.embed);
  }
  if (!navigator.share) {
    shareButton.style.display = "none";
  }
  if (!navigator.onLine) {
    progressBar.classList.remove("hs-progress-bar--online");
  }
  performance.mark("UI ready");
  console.groupEnd();
});

addEventListener("offline", () => {
  progressBar.classList.remove("hs-progress-bar--online");
  const form = document.querySelector(".hs-form");
  if (form) form.firstElementChild.setAttribute("disabled", "disabled");
});

addEventListener("online", () => {
  progressBar.classList.add("hs-progress-bar--online");
  const form = document.querySelector(".hs-form");
  if (form) form.firstElementChild.removeAttribute("disabled");
});

function warmImageCache() {
  const params = new URLSearchParams(location.search);
  const query = new URLSearchParams({ url: params.get("url") });
  fetch(`https://api2.hlidacshopu.cz/og?${query}`, {
    method: "HEAD"
  }).catch(() => {});
  return true;
}

shareButton.addEventListener("click", () => {
  if (!navigator.share) return false;
  warmImageCache();
  navigator
    .share({ url: "", title: "Podívejte se na vývoj ceny na Hlídači shopů" })
    .catch(() => {});
});

searchButton.addEventListener("click", () => {
  location.assign("/app/");
});

function showUpdateSnackbar() {
  snackbar.actionButtonText = "Aktualizovat";
  snackbar.labelText = "K dispozici je nová verze.";
  snackbar.timeoutMs = -1;
  snackbar.open();
}

function registerUpdateHandler(wb, registration) {
  snackbarElement.addEventListener(
    "MDCSnackbar:closed",
    e => {
      if (e.detail.reason === "action") {
        wb.addEventListener("controlling", () => location.reload(), true);
        if (registration && registration.waiting) {
          messageSW(registration.waiting, { type: "SKIP_WAITING" });
        }
      }
    },
    { once: true }
  );
}

const isProduction = () =>
  ["localhost", "127"].indexOf(location.hostname) === -1;

if ("serviceWorker" in navigator && isProduction()) {
  const wb = new Workbox("/sw.js");
  let registration;

  const showSkipWaitingPrompt = () => {
    registerUpdateHandler(wb, registration);
    showUpdateSnackbar();
  };

  wb.addEventListener("waiting", showSkipWaitingPrompt);
  wb.addEventListener("externalwaiting", showSkipWaitingPrompt);
  wb.register()
    .then(r => (registration = r))
    .catch(ex => console.error(ex));
}

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
  const embed = searchParams.get("embed");
  return targetURL && { title, targetURL, shop, embed };
}

async function renderResultsModal(detailUrl, isEmbed) {
  render(loaderTemplate(), root);
  try {
    const chartData = await fetchDataSet(detailUrl);
    console.log(chartData, { isEmbed });
    if (isEmbed) toolbar.classList.remove("toolbar--visible");
    else toolbar.classList.add("toolbar--visible");
    render(resultTemplate(templateData(detailUrl, chartData), isEmbed), root);
  } catch (ex) {
    console.error(ex);
    render(notFoundTemplate(), root);
  }
}

function resultTemplate(
  {
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
  },
  isEmbed
) {
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
        ${discountTemplate(
          {
            realDiscount: discount,
            type: discountType,
            claimedDiscount
          },
          true
        )}
      </div>
      <div class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12">
        <hs-chart .data="${data}"></hs-chart>
      </div>
      ${isEmbed || !navigator.share
        ? html`
            <div
              class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 hs-share-buttons"
            >
              <a
                class="tw-button"
                href="${`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  location.href
                )}&hashtags=hlidacshopu`}"
                @click="${() => warmImageCache()}"
                target="_blank"
                rel="noopener noreferrer"
              >
                <i></i>
                <span>Tweet</span>
              </a>
              <a
                class="fb-button"
                href="${`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
                  location.href
                )}`}"
                @click="${() => warmImageCache()}"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  class="img"
                  style="vertical-align:middle"
                  src="https://static.xx.fbcdn.net/rsrc.php/v3/yd/r/pXqmY8Ggh_m.png"
                  alt=""
                  width="16"
                  height="16"
                />
                <span>Sdílet</span>
              </a>
            </div>
          `
        : null}
    </div>
  `;
}

function registerStylesheet(href) {
  const styles = document.createElement("link");
  styles.rel = "stylesheet";
  styles.href = href;
  document.head.insertAdjacentElement("beforeend", styles);
}
