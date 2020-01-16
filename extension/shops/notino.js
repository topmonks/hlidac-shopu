/* global cleanPrice */

let notinoLastHref = null;

const notino = {
  masterId: null,

  onDetailPage(cb) {
    const elem = document.getElementById("pd-price");
    if (!elem) return false;

    const observer = new MutationObserver(function() {
      if (location.href !== notinoLastHref) {
        notinoLastHref = location.href;
        cb(true);
      }
    });
    // Observe changes in variant selection by change of price
    observer.observe(document.body, {
      characterData: true,
      subtree: true
    });
    // This page is rendered with React and data are side-loaded from API
    // defer execution to `load` event when all data are loaded and rendered
    addEventListener("load", () => cb());
  },

  waitStateObject() {
    return new Promise((resolve, reject) => {
      const elt = document.createElement("script");
      elt.innerHTML = 'window.postMessage({ type: "HLIDAC_SHOPU_STATE_OBJECT", state: window.__APOLLO_STATE__ }, "*");';
      document.head.appendChild(elt);
      const timeout = setTimeout(() => reject(new Error("No item id")), 500);
      window.addEventListener("message", function(event) {
        // We only accept messages from ourselves
        if (event.source != window)
          return;

        if (event.data.type && (event.data.type == "HLIDAC_SHOPU_STATE_OBJECT")) {
          clearTimeout(timeout);
          return resolve(event.data.state);
        }
      }, false);
    });
  },

  async getMasterId() {
    const apolloState = await this.waitStateObject();
    const [, [masterRes]] = Object.entries(apolloState.ROOT_QUERY).find(([k,]) => k.startsWith("productDetailByMasterId"));
    const masterId = masterRes.id.replace("Product:", "");
    console.log(`Found master id ${masterId}`); // eslint-disable-line no-console
    return masterId;
  },

  async getInfo() {
    const elem = document.getElementById("pdHeader");
    if (!elem) return;
    const title = document.querySelector("h1").textContent.trim();
    const currentPrice = cleanPrice("#pd-price");
    const originalPrice = cleanPrice("[aria-describedby=tippy-tooltip-1]");
    let itemId = (() => {
      const match = window.location.pathname.match(/\/p-(\d+)\//);
      return match ? match[1] : null;
    })();

    if (!itemId) {
      itemId = this.masterId || await this.getMasterId();
      this.masterId = itemId;
    }

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

window.shops = window.shops || {};
window.shops["notino"] = notino;
