import $ from 'jquery'
import plot from 'lib/plot'
import dataStore from 'lib/dataStore'
import chartWrapper from 'lib/utils'

async function waitForImageId() {
  return new Promise((resolve, reject) => {
    const elt = document.createElement("script");
    elt.innerHTML = 'window.postMessage({ type: "ITEM_ID", text: window.CONFIGURATION.variant.imageId }, "*");';
    document.head.appendChild(elt);
    const timeout = setTimeout(() => reject(new Error("No item id")), 500);
    window.addEventListener("message", function(event) {
      // We only accept messages from ourselves
      if (event.source != window)
        return;

      if (event.data.type && (event.data.type == "ITEM_ID")) {
        clearTimeout(timeout);
        return resolve(event.data.text);
      }
    }, false);
  });
}

export default async function mall() {
  const elem = $(".price-wrapper");
  if (elem.length === 0) return;
  const markup = chartWrapper();
  elem.after(markup);

  const imageId = await waitForImageId();

  dataStore.fetchData(window.location.href, imageId)
    .then(function (data) {
      plot("pricesChart", ...data);
    });
}
