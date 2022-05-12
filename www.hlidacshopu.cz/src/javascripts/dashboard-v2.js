import { html, svg, render } from "lit";
import {
  formatNumber,
  formatPercents,
  formatShortDate
} from "@hlidac-shopu/lib/format.mjs";
import { fetchDashboardV2Data } from "@hlidac-shopu/lib/remoting.mjs";
import { rating } from "@hlidac-shopu/lib/templates.mjs";
import * as rollbar from "./rollbar.js";

rollbar.init();

const tableRoot = document.getElementById("table-root");

addEventListener("DOMContentLoaded", async e => {
  try {
    const data = await fetchDashboardV2Data();
    tableRoot.innerHTML = null;
    render(tableTemplate(data), tableRoot);
  } catch (ex) {
    console.error(ex);
  }
});

function tableTemplate(data) {
  return data
    .filter(x => !x.hidden)
    .map(x => Object.assign({}, x, { updatedAt: new Date(x.updatedAt) }))
    .sort((a, b) => a.sortKey - b.sortKey)
    .filter(x => x.allProducts)
    .map(shopTemplate);
}

function shopTemplate({
  name,
  url,
  logo,
  viewBox,
  allProducts,
  bfProducts,
  avgClaimedDiscount,
  avgRealDiscount,
  updatedAt,
  misleadingCount,
  manipulatedCount,
  rating: ratingValue
}) {
  return html`
    <tr class="dashboard-row">
      <th scope="row">${logoTemplate({ name, url, logo, viewBox })}</th>
      <td>${formatNumber(allProducts)}</td>
      <td>${formatNumber(bfProducts) ?? "-"}</td>
      <td>${formatPercents(avgClaimedDiscount) ?? "-"}</td>
      <td>${formatPercents(avgRealDiscount) ?? "-"}</td>
      <td>${formatNumber(misleadingCount) ?? "-"}</td>
      <td>${formatNumber(manipulatedCount) ?? "-"}</td>
      <td>${formatShortDate(updatedAt) ?? "-"}</td>
      <td>${rating(ratingValue, { maxValue: 3 }) ?? "-"}</td>
    </tr>
  `;
}

function logoTemplate({ logo, name, url, viewBox }) {
  const image = svg`
    <svg viewBox="${viewBox ?? ""}">
      <title>${name}</title>
      <use href="#${logo}"/>
    </svg>
  `;
  return html`
    <a href="${url}" class="sprite sprite--${logo}" title="${name}">${image}</a>
  `;
}
