import { html, svg, render } from "lit-html/lit-html.js";
import { formatNumber, formatPercents } from "@hlidac-shopu/lib/format.js";
import { fetchDashboardData } from "@hlidac-shopu/lib/remoting.js";

const tableRoot = document.getElementById("table-root");

addEventListener("DOMContentLoaded", async e => {
  try {
    const data = await fetchDashboardData();
    render(tableTemplate(data), tableRoot);
  } catch (ex) {
    console.error(ex);
  }
});

function tableTemplate(data) {
  return data
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
  avgRealDiscount
}) {
  return html`
    <tr class="dashboard-row">
      <th scope="row">${logoTemplate({ name, url, logo, viewBox })}</th>
      <td>${formatNumber(allProducts)}</td>
      <td>${formatNumber(bfProducts) || "-"}</td>
      <td>${formatPercents(avgClaimedDiscount) || "-"}</td>
      <td>${formatPercents(avgRealDiscount) || "-"}</td>
    </tr>
  `;
}

function logoTemplate({ logo, name, url, viewBox }) {
  const image = svg`
      <svg viewBox="${viewBox}">
        <title>${name}</title>
        <use href="#${logo}"/>
      </svg>
    `;
  return html`
    <a href="${url}" class="sprite sprite--${logo}" title="${name}">${image}</a>
  `;
}
