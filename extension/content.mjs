import { render } from "lit-html/lit-html.js";
import { createChart, getCanvasContext } from "@hlidac-shopu/lib/chart.mjs";
import { widgetTemplate } from "@hlidac-shopu/lib/templates.mjs";
import { getShop } from "./helpers.mjs";
import "./shops/index.mjs";

function toCssString(obj) {
  if (!obj) return "";
  return Object.entries(obj)
    .map(([key, value]) => `${key}:${value};`)
    .join("");
}

function getVersion() {
  return (chrome || browser).runtime.getManifest().version;
}

function fetchData(url, info) {
  const searchString = new URLSearchParams(
    Object.entries(info).filter(([, val]) => Boolean(val))
  );
  searchString.append("url", url);
  searchString.append("ext", getVersion());
  return fetch(`https://api2.hlidacshopu.cz/detail?${searchString}`).then(
    resp => {
      if (resp.status === 404) {
        return resp.json();
      }
      if (!resp.ok) {
        throw new Error("HTTP error, status = " + resp.status);
      }
      return resp.json();
    }
  );
}

const renderRoot = document.createElement("div");
renderRoot.dataset["hs"] = getVersion();
const shadow = renderRoot; //TODO: re-enable .attachShadow({ mode: "closed" }); after Chart.js update
let chart;
function renderHTML(repaint, shop, data, metadata) {
  if (!shop.loaded || !repaint) {
    shop.inject(styles => {
      renderRoot.setAttribute(
        "style",
        toCssString(Object.assign({ "margin": "16px 0" }, styles))
      );
      return renderRoot;
    });
  }
  if (repaint && chart) chart.destroy();
  render(widgetTemplate(data, metadata), shadow);
  const ctx = getCanvasContext(shadow);
  chart = createChart(
    ctx,
    data.currentPrice,
    data.originalPrice,
    "Uváděná původní cena",
    "Prodejní cena"
  );
}

function injectFont() {
  const fontImport = document.createElement("link");
  fontImport.rel = "stylesheet";
  fontImport.href =
    "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;700&display=swap";
  document.head.insertAdjacentElement("beforeend", fontImport);
}

function handleDetail(shop) {
  shop.scheduleRendering(
    async repaint => {
      try {
        const info = await shop.scrape();
        if (!info) {
          // we don't understand this page
          return false;
        }

        const url = info.url || location.href;
        const res = await fetchData(url, info);
        if (res.error || (res.metadata && res.metadata.error)) {
          console.error(
            "Error fetching data: ",
            res.error || res.metadata.error
          );
          return false;
        }
        if (!res.data || res.data.length === 0) {
          console.error("No data found:", res);
          return false;
        }

        const { itemId } = info;
        console.log(`Chart loaded for ItemID: ${itemId}`);
        console.log({ info, metadata: res.metadata, dataset: res.data });

        renderHTML(repaint, shop, res.data, res.metadata);

        const params = new URLSearchParams({ url, itemId, debug: 1 });
        console.log(`https://www.hlidacshopu.cz/app/?${params}`);
        return true;
      } catch (e) {
        console.error(e);
        return false;
      } finally {
        console.groupEnd();
      }
    },
    () => {
      renderRoot.remove();
      if (chart) chart.destroy();
      shop.loaded = false;
    }
  );
}

async function main() {
  console.group("Hlídačshopů.cz");
  console.log(`version: %c${getVersion()}`, "font-weight: 700");
  const shop = getShop(location.href);
  if (!shop) {
    console.log("No shop found");
    console.groupEnd();
    return;
  }
  injectFont();
  handleDetail(shop);
}

main().catch(err => console.error(err));
