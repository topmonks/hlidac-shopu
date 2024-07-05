import { createChart, getCanvasContext } from "@hlidac-shopu/lib/chart.mjs";
import { fetchDataSet } from "@hlidac-shopu/lib/remoting.mjs";
import { widgetTemplate } from "@hlidac-shopu/lib/templates.mjs";
import { html, render } from "lit-html";

const root = document.getElementById("app-root");

addEventListener("DOMContentLoaded", async () => {
  console.group("Hlídačshopů.cz");
  const sharedInfo = getSharedInfo(location);
  console.log("Shared data:", sharedInfo);
  if (sharedInfo) {
    document.body.classList.remove("home-screen");
    await renderResults(sharedInfo.targetURL);
    performance.mark("UI ready");
  }
  console.groupEnd();
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

async function renderResults(detailUrl) {
  try {
    const res = await fetchDataSet(detailUrl);
    render(
      widgetTemplate(res.metadata, {
        showFooter: false,
        showClaimedDiscount: true,
        showImage: true
      }),
      root
    );
    const ctx = getCanvasContext(root);
    createChart(ctx, res.data.currentPrice, res.data.originalPrice, "Uváděná původní cena", "Prodejní cena", false);
  } catch (ex) {
    console.error(ex);
    render(notFoundTemplate(), root);
  }
}

function notFoundTemplate() {
  return html`
    <div class="hs-result layout-wrapper">
      <h2>Nenalezeno</h2>
      <div class="box box--purple">
        <p>
          Je nám líto, ale hledaný produkt nebo e-shop nemáme v naší databázi.
        </p>
      </div>
    </div>
  `;
}
