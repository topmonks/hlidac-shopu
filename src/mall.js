import plot from 'lib/plot'
import { fetchData } from 'lib/dataStore'
import chartWrapper from 'lib/utils'

const $ = document.querySelector.bind(document);

function waitForInfo() {
  return new Promise((resolve, reject) => {
    const elt = document.createElement("script");
    elt.innerHTML = 'window.postMessage({ type: "ITEM_ID", text: window.CONFIGURATION.variant.id }, "*");';
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
  if (!elem) return;
  const markup = chartWrapper();
  elem.insertAdjacentHTML("afterend", markup);

  const productId = $('span[data-sel="catalog-number"]').innerText.trim();
  const title = $('h1[itemprop="name"]').innerText.trim();
  const chartElem = $("#hlidacShopu-chart");

  const data = await fetchData(window.location.href, productId, title)
  plot(chartElem, data);
}
