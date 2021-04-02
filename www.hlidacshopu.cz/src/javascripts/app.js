import { fetchDataSet } from "@hlidac-shopu/lib/remoting.mjs";
import { shopName } from "@hlidac-shopu/lib/shops.mjs";
import {
  loaderTemplate,
  notFoundTemplate
} from "@hlidac-shopu/lib/templates.mjs";
import { MDCSnackbar } from "@material/snackbar/component.js";
import { MDCTopAppBar } from "@material/top-app-bar/component.js";
import { defAtom } from "@thi.ng/atom";
import { html, render } from "lit-html";
import { Workbox } from "workbox-window/build/workbox-window.prod.mjs";
import * as rollbar from "./rollbar.js";

rollbar.init();

registerStylesheets([
  "/assets/css/app.css",
  "https://fonts.googleapis.com/icon?family=Material+Icons"
]);

const topAppBarElement = document.querySelector(".mdc-top-app-bar");
MDCTopAppBar.attachTo(topAppBarElement);
const snackbarElement = document.querySelector(".mdc-snackbar");
const snackbar = MDCSnackbar.attachTo(snackbarElement);

const root = document.getElementById("app-root");
const toolbar = document.getElementById("toolbar");
const logoLink = document.getElementById("logo-link");
const shareButton = document.getElementById("share-button");
const searchButton = document.getElementById("search-button");
const installBanner = document.getElementById("install-banner");
const help = document.getElementById("help");
const progressBar = document.querySelector(".hs-progress-bar");
const textField = document.querySelector(".hs-textfield");

const state = defAtom({});
const view = template => state.resetIn(["view"], template);
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

const scheduleRendering = renderScheduler();
state.addWatch("render", (id, prev, curr) => {
  const { view } = curr;
  if (typeof view !== "function") return;
  scheduleRendering({
    preFirstRender() {
      root.innerHTML = null;
    },
    render() {
      root.classList.add("hs-result");
      console.log("Render view: " + view.name);
      render(view(curr), root);
    }
  });
});

function removeToolbarFromEmbedView(isEmbed) {
  if (isEmbed) {
    toolbar.classList.remove("toolbar--visible");
  } else {
    toolbar.classList.add("toolbar--visible");
  }
}

addEventListener("DOMContentLoaded", async () => {
  try {
    console.group("Hlídačshopů.cz");
    const url = new URL(location.href);
    const sharedInfo = getSharedInfo(url);
    console.log("Shared data:", sharedInfo);
    removeToolbarFromEmbedView(isEmbed(sharedInfo));
    if (sharedInfo) {
      await renderResults(root, sharedInfo);
    } else if (url.searchParams.has("install")) {
      showInstallBanner();
    } else if (url.searchParams.has("help")) {
      showHelp();
    }
    if (!navigator.share) {
      hideShareButton();
    }
    if (!navigator.onLine) {
      showOfflineBanner();
    }
    if (isWebView(navigator.userAgent)) {
      logoLink.href = "/app/";
      if (help) showHelp();
    }
    performance.mark("UI ready");
  } catch (err) {
    if (err.message.indexOf("valid URL") > -1) {
      view(invalidURLTemplate);
    }
    console.error(err);
  } finally {
    console.groupEnd();
  }
});

addEventListener("offline", () => {
  showOfflineBanner();
  disableForm();
});

addEventListener("online", () => {
  hideOfflineBanner();
  enableForm();
});

addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  const installPrompt = e;
  if (!installBanner) return;
  showInstallBanner();
  installBanner.addEventListener("click", () => {
    installPrompt.prompt();
    hideInstallBanner();
  });
});

addEventListener("appinstalled", e => {
  console.log("appinstalled", e);
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

const textFieldInput = textField.querySelector("input");
textFieldInput.addEventListener("focus", () => {
  textField.classList.add("hs-textfield--focused");
});
textFieldInput.addEventListener("blur", () => {
  textField.classList.remove("hs-textfield--focused");
});
textFieldInput.addEventListener("invalid", () => {
  textField.classList.add("hs-textfield--invalid");
});
textFieldInput.addEventListener("input", () => {
  textField.classList.remove("hs-textfield--invalid");
});

function isWebView(ua) {
  return /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
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

function getTargetURL(searchParams) {
  const targetURL = searchParams.get("url") || searchParams.get("text");
  return targetURL && targetURL.trim().split(" ").pop();
}

function getShop(targetURL) {
  if (!targetURL) return null;
  return shopName(targetURL);
}

function isEmbed({ view }) {
  return view === "embed";
}

function getSharedInfo({ searchParams }) {
  const targetURL = getTargetURL(searchParams);
  const title = searchParams.get("title");
  const shop = getShop(targetURL);
  const view = searchParams.get("view");
  return targetURL && { title, targetURL, shop, view };
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

function registerStylesheets(hrefs) {
  render(
    hrefs.map(href => html`<link rel="stylesheet" href="${href}" />`),
    document.head
  );
}

function changeScreen(screen) {
  root.parentElement.classList.value = `${screen}-screen`;
}

function renderResults(root, { targetURL, ...sharedInfo }) {
  changeScreen("result");
  view(loaderTemplate);
  return Promise.all([fetchDataSet(targetURL), import("./results.js")])
    .then(([chartData, { renderResults }]) => {
      const resultsTemplate = () =>
        renderResults({
          detailUrl: targetURL,
          isEmbed: isEmbed(sharedInfo),
          chartData
        });
      return view(resultsTemplate);
    })
    .catch(() => view(notFoundTemplate));
}

function showInstallBanner() {
  installBanner.classList.add("hs-install-banner--visible");
}

function hideInstallBanner() {
  installBanner.classList.remove("hs-install-banner--visible");
}

function showHelp() {
  help.classList.add("help--visible");
}

function hideShareButton() {
  shareButton.style.display = "none";
}

function showOfflineBanner() {
  progressBar.classList.remove("hs-progress-bar--online");
  progressBar.classList.add("mdc-top-app-bar--fixed-adjust");
}

function hideOfflineBanner() {
  progressBar.classList.add("hs-progress-bar--online");
  progressBar.classList.remove("mdc-top-app-bar--fixed-adjust");
}

function showUpdateSnackbar() {
  snackbarElement.style.display = "block";
  snackbar.actionButtonText = "Aktualizovat";
  snackbar.labelText = "K dispozici je nová verze.";
  snackbar.timeoutMs = -1;
  snackbar.open();
}

function disableForm() {
  const form = document.querySelector(".hs-form");
  if (form) form.firstElementChild.setAttribute("disabled", "disabled");
}

function enableForm() {
  const form = document.querySelector(".hs-form");
  if (form) form.firstElementChild.removeAttribute("disabled");
}

function renderScheduler() {
  let uiUpdateId;
  let isFirstUpdate = true;
  return ({ preFirstRender, render }) => {
    if (uiUpdateId) {
      cancelAnimationFrame(uiUpdateId);
      uiUpdateId = null;
    }
    uiUpdateId = requestAnimationFrame(() => {
      if (isFirstUpdate) {
        isFirstUpdate = false;
        preFirstRender();
      }
      render();
    });
  };
}
