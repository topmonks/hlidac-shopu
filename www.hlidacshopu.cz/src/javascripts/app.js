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
const logoLink = document.getElementById("logo-link");
const shareButton = document.getElementById("share-button");
const searchButton = document.getElementById("search-button");
const progressBar = document.querySelector(".hs-progress-bar");

addEventListener("DOMContentLoaded", async () => {
  try {
    console.group("Hlídačshopů.cz");
    const sharedInfo = getSharedInfo(location);
    console.log("Shared data:", sharedInfo);
    if (sharedInfo) {
      root.parentElement.classList.remove("home-screen");
      await renderResultsModal(
        sharedInfo.targetURL,
        sharedInfo.view === "embed"
      );
    }
    if (!navigator.share) {
      shareButton.style.display = "none";
    }
    if (!navigator.onLine) {
      progressBar.classList.remove("hs-progress-bar--online");
    }
    if (navigator.standalone) {
      logoLink.href = "/app/";
    }
    performance.mark("UI ready");
  } catch (err) {
    if (err.message.indexOf("valid URL") > -1) {
      root.classList.add("hs-result");
      render(invalidURLTemplate(), root);
    }
    console.error(err);
  } finally {
    console.groupEnd();
  }
});

addEventListener("offline", () => {
  progressBar.classList.remove("hs-progress-bar--online");
  progressBar.classList.add("mdc-top-app-bar--fixed-adjust");
  const form = document.querySelector(".hs-form");
  if (form) form.firstElementChild.setAttribute("disabled", "disabled");
});

addEventListener("online", () => {
  progressBar.classList.add("hs-progress-bar--online");
  progressBar.classList.remove("mdc-top-app-bar--fixed-adjust");
  const form = document.querySelector(".hs-form");
  if (form) form.firstElementChild.removeAttribute("disabled");
});

shareButton.addEventListener("click", () => {
  if (!navigator.share) return false;
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

function registerUpdateHandler(wb) {
  snackbarElement.addEventListener(
    "MDCSnackbar:closed",
    e => {
      if (e.detail.reason === "action") {
        wb.addEventListener("controlling", () => location.reload(), true);
        wb.messageSkipWaiting();
      }
    },
    { once: true }
  );
}

const isProduction = () =>
  ["localhost", "127"].indexOf(location.hostname) === -1;

if ("serviceWorker" in navigator && isProduction()) {
  const wb = new Workbox("/sw.js");

  const showSkipWaitingPrompt = () => {
    registerUpdateHandler(wb);
    showUpdateSnackbar();
  };

  wb.addEventListener("waiting", showSkipWaitingPrompt);
  wb.register().catch(ex => console.error(ex));
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
  const view = searchParams.get("view");
  return targetURL && { title, targetURL, shop, view };
}

async function renderResultsModal(detailUrl, isEmbed) {
  root.classList.add("hs-result");
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

function invalidURLTemplate() {
  return html`
    <div id="hlidac-shopu-modal__not-found" class="layout-wrapper">
      <div class="">
        <h2>Neplatná adresa zboží</h2>
      </div>
      <div class="box box--purple">
        <p>
          Vypadá to, že se snažíte zadat hledaný výraz, místo adresy produktu.
          Mrzí nás to, ale Hlídač Shopů zatím neumí hledat zboží podle názvu,
          ale pouze podle adresy webové stránky.
        </p>
        <p>
          Adresu získáte tak, že navštívíte stránky vašeho oblíbeného eshopu a
          najdete požadované zboží tam. Kliknete do adresního řádku a adresu
          zkopírujete do schránky. Tu poté vložíte do pole na Hlídači Shopů.
        </p>
        <p>
          Pokud používáte Hlídače Shopů v mobilním telefonu Android, můžete si
          celý proces zjednodušit přidáním Hlídače Shopů na Plochu. Tím získáte
          možnost sdílet odkazy jak z webu, tak aplikací e-shopů přímo do
          Hlídače Shopů.
        </p>
      </div>
    </div>
  `;
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
    <div id="hlidac-shopu-modal__found" class="layout-wrapper">
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
      <div class="hs-chart">
        <hs-chart .data="${data}"></hs-chart>
      </div>
      ${isEmbed || !navigator.share
        ? html`
            <div class="hs-share-buttons">
              <a
                class="tw-button"
                href="${`https://twitter.com/intent/tweet?url=${encodeURIComponent(
                  location.href
                )}&hashtags=hlidacshopu`}"
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
                target="_blank"
                rel="noopener noreferrer"
              >
                <img
                  class="img"
                  style="vertical-align:middle"
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfjBBYGJDeRLlUUAAABp0lEQVRIx6WVu04bQRSG/x1jbZCR00RacAJYooksd/RI7qBJHiAlD5F2lQYhkSLFNrwFFVIaUsRRJEspSYnExcRFCguDE1F8FPaavczYXvinmZk955vLmT3HQxaV1dJ7NVRTTVJXXZ3qSCe6t9iSbQERfWzqExFk7dNDn5AB03RDiO8CBLSZR+3kPh7dm5zP5Q5wTjMLCAq4jxBBEuDzw2F4zyfe4lPmJWtspg7iPwJCh3uPrcytJxXGgMB58zu5IKcjEowAkcP9BE0FQIRE2fFs4MNMQJ+yUUtV2fV70tvVdRy1lKpquQ8Alcm6XadNZNSQS7eT3rLTpmFU02x5zi81jxstzXTDCRgYC90bt/xMPU8w6s1xhFhruZnecwF/jDrPAvwy+loAsJqbOfaoqKeK1Xx2FO70yuhWhwX2kNahhkK85r/1mbp+oVhDVpCRdKW9J61/oOu4Lizws/AOvrOQTKp1LgoBuqxm0/oGl3MDztiwFZZ6Jje7AB3euEpbiZB/UwFDPlJy10YhVvg8ztJZwF/2WZ9eXOO2yDZfEuNv7PGOFzbbB6Kd0fTJtKEiAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE5LTA0LTIyVDEzOjM2OjU1LTA3OjAwi4nE0AAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxOS0wNC0yMlQxMzozNjo1NS0wNzowMPrUfGwAAAAASUVORK5CYII="
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
