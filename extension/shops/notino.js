/* global cleanPrice */

let notinoLastHref = null;

window.shops = window.shops || {};
window.shops["notino"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (location.href !== notinoLastHref) {
        notinoLastHref = location.href;
        cb(true);
      }
    });
    // Observe changes in variant selection by change of price
    observer.observe(document.getElementById("pd-price"), {
      characterData: true,
      subtree: true
    });
    // This page is rendered with React and data are side-loaded from API
    // defer execution to `load` event when all data are loaded and rendered
    addEventListener("load", () => cb());
  },

  getInfo() {
    const elem = document.getElementById("pdHeader");
    if (!elem) return;
    const scripts = document.getElementsByTagName("script");
    const appoloState = /window.__APOLLO_STATE__\s?=/g;
    let itemId = null;
    var content = null;
    for (const item of scripts) {
      if (item.attributes.length === 0) {
        const match = item.innerHTML.match(appoloState);
        if (match) {
          const scriptText = item.innerHTML.replace(/\r?\n|\r/g, "");
          content = scriptText.substring(
            scriptText.search(appoloState) +
              scriptText.match(appoloState)[0].length,
            scriptText.length
          );
        }
      }
    }
    if (!content) {
      throw new Error("Notino: Cannot find itemId");
    }
    const match = content.match(/Product:(\d+)/);
    if (match && match[1]) {
      itemId = match[1];
    }
    if (!itemId) {
      throw new Error("Notino: cannot find itemId in content");
    }
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice("#pd-price");
    const originalPrice = cleanPrice("[aria-describedby=tippy-tooltip-1]");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = document.getElementById("pdAddToCart");
    if (!elem) throw new Error("Element to add chart not found");
    const markup = chartMarkup({ margin: "16px" });
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
