import { render, html } from "lit-html";
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
const shadow = renderRoot.attachShadow({ mode: "closed" });
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
  render(
    html`<link rel="stylesheet" href="https://use.typekit.net/nxm2nnh.css" />`,
    document.head
  );
}

function handleDetail(shop) {
  return shop.scheduleRendering({
    async fetchData(info) {
      const url = info.url ?? location.href;
      const res = await fetchData(url, info);
      if (res.error || res.metadata?.error) {
        console.error("Hlídačshopů.cz - Error fetching data: ", res.error || res.metadata.error);
        return null;
      }
      if (!res.data || res.data.length === 0) {
        console.error("Hlídačshopů.cz - No data found:", res);
        return null;
      }
      return { url, info, metadata: res.metadata, dataset: res.data };
    },
    render(repaint, { url, info, metadata, dataset }) {
      try {
        const { itemId } = info;
        console.log(`Hlídačshopů.cz - Chart loaded for ItemID: ${itemId}`);
        console.log("Hlídačshopů.cz - Render:",{ info, metadata, dataset });
        renderHTML(repaint, shop, dataset, metadata);
        const params = new URLSearchParams({ url, itemId, debug: 1 });
        console.log(`Hlídačshopů.cz - Debug URL: https://www.hlidacshopu.cz/app/?${params}`);
        return true;
      } catch (e) {
        console.error(e);
        return false;
      }
    },
    cleanup() {
      renderRoot.remove();
      if (chart) chart.destroy();
      shop.loaded = false;
    }
  });
}

async function main() {
  console.log(`Hlídačshopů.cz - Version: %c${getVersion()}`, "font-weight: 700");
  const shop = getShop(location.href);
  if (!shop) {
    console.log("Hlídačshopů.cz - No shop found");
    console.groupEnd();
    return;
  }
  injectFont();
  await handleDetail(shop);
}

main().catch(err => console.error(err));
