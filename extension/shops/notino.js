/* global $ */

window.shops = window.shops || {};
window.shops["notino"] = {
  onDetailPage(cb) { cb(); },

  getInfo() {
    const elem = $("#pdHeader");
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
          content = scriptText
            .substring(
              scriptText.search(appoloState) + scriptText.match(appoloState)[0].length, scriptText.length,
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
    const title = $("h1").textContent.trim();

    return {itemId, title};
  },

  insertChartElement(chartMarkup) {
    const elem = $("#pdSelectedVariant");
    if (!elem) throw new Error("Element to add chart not found");
    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
