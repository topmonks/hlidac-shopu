import { html, svg, render } from "lit-html";
import {
  formatNumber,
  formatPercents,
  formatShortDate
} from "@hlidac-shopu/lib/format.mjs";
import { fetchDashboardData } from "@hlidac-shopu/lib/remoting.mjs";
import * as rollbar from "./rollbar.js";

rollbar.init();

const tableRoot = document.getElementById("table-root");

const extraData = new Map([
  [
    2020,
    new Map([
      ["aaaauto", { startDate: new Date("2020-11-26") }],
      ["aaaauto_sk", { startDate: new Date("2020-11-26") }],
      ["alza", { startDate: new Date("2020-11-11") }],
      ["alza_sk", { startDate: new Date("2020-11-11") }],
      ["benu", { startDate: new Date("2020-11-25") }],
      ["czc", { startDate: new Date("2020-10-31") }],
      ["datart", { startDate: new Date("2020-11-13") }],
      ["datart_sk", { startDate: new Date("2020-11-13") }],
      ["kosik", { startDate: new Date("2020-11-26") }],
      ["lekarna", { startDate: new Date("2020-11-20") }],
      ["mall", { startDate: new Date("2020-10-28") }],
      ["mall_sk", { startDate: new Date("2020-10-28") }],
      ["mironet", { startDate: new Date("2020-10-31") }],
      ["notino", { startDate: new Date("2020-11-04") }],
      ["notino_sk", { startDate: new Date("2020-11-04") }],
      ["okay", { startDate: new Date("2020-11-14") }],
      ["okay_sk", { startDate: new Date("2020-11-14") }],
      ["pilulka", { startDate: new Date("2020-11-19") }],
      ["pilulka_sk", { startDate: new Date("2020-11-19") }],
      ["prozdravi", { startDate: new Date("2020-11-23") }],
      ["tsbohemia", { startDate: new Date("2020-10-31") }]
    ])
  ],
  [2021, new Map()]
]);

function addExtraData(year) {
  const data = extraData.get(year);
  return x => Object.assign({}, x, data.get(x.shop));
}

addEventListener("DOMContentLoaded", async e => {
  try {
    const data = await fetchDashboardData(2021);
    tableRoot.innerHTML = null;
    render(tableTemplate(data), tableRoot);
  } catch (ex) {
    console.error(ex);
  }
});

function tableTemplate(data) {
  return data
    .map(addExtraData(2021))
    .map(x => {
      if (typeof x.startDate === "string") x.startDate = new Date(x.startDate);
      return x;
    })
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
  startDate
}) {
  return html`
    <tr class="dashboard-row">
      <th scope="row">${logoTemplate({ name, url, logo, viewBox })}</th>
      <td>${formatNumber(allProducts)}</td>
      <td>${formatNumber(bfProducts) || "-"}</td>
      <td>${formatPercents(avgClaimedDiscount) || "-"}</td>
      <td>${formatPercents(avgRealDiscount) || "-"}</td>
      <td>${formatShortDate(startDate) || "-"}</td>
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
