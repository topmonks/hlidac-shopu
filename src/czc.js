import plot from 'lib/plot'
import { fetchData } from 'lib/dataStore'
import chartWrapper from 'lib/utils'

const $ = document.querySelector.bind(document);

export default async function czc() {
  const elem = $("#product-price-and-delivery-section");
  if (!elem) return;
  const markup = chartWrapper();
  elem.insertAdjacentHTML("afterend", markup);

  const itemId = $('span[itemprop="sku"]').innerText.replace('a', '');
  const title = $('h1[title~="Název"]').getAttribute("aria-label").trim();
  const chartElem = $('#hlidacShopu-chart');

  const data = await fetchData(window.location.href, itemId, title)
  plot(chartElem, data);
}
