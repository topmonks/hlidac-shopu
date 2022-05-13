import { html, svg, render } from "lit";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
import {
  formatNumber,
  formatPercents,
  formatShortDate
} from "@hlidac-shopu/lib/format.mjs";
import { fetchDashboardV2Data } from "@hlidac-shopu/lib/remoting.mjs";
import { rating } from "@hlidac-shopu/lib/templates.mjs";
import * as rollbar from "./rollbar.js";

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

function cardTemplate({
  name,
  shop,
  inSale,
  weDontAgree,
  rating: ratingValue,
  link,
  body
}) {
  return html`
    <div
      class="hs-card mdc-layout-grid__cell mdc-layout-grid__cell--span-6"
      id="${shop}"
    >
      <a
        href="${link}"
        target="drive"
        title="Přejít na detailní data v Google Sheets"
      >
        <h3>${name} ${rating(ratingValue, { maxValue: 3 }) ?? "-"}</h3>

        <div class="hs-metrics">
          <dl class="hs-metrics__item">
            <dt>produktů ve slevě</dt>
            <dd>
              <data value="${inSale}">${formatPercents(inSale) ?? "-"}</data>
            </dd>
          </dl>
          <dl class="hs-metrics__item">
            <dt>slevy nesedí</dt>
            <dd>
              <data value="${weDontAgree}"
                >${formatPercents(weDontAgree) ?? "-"}</data
              >
            </dd>
          </dl>
        </div>
        ${unsafeHTML(body)}
      </a>
    </div>
  `;
}

// <p>
//         Naposledy aktualizováno
//         <time datetime="${updatedAt?.toISOString()}"
//           >${formatShortDate(updatedAt) ?? "-"}</time
//         >
//       </p>

function cardsTemplate(data) {
  return data
    .filter(x => x.allProducts && !x.hidden)
    .map(x =>
      Object.assign({}, x, {
        inSale: x.bfProducts / x.allProducts,
        weDontAgree:
          x.bfProducts !== 0
            ? (x.misleadingCount + x.manipulatedCount) / x.bfProducts
            : 0
      })
    )
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(cardTemplate);
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

function tableTemplate(data) {
  return data
    .filter(x => x.allProducts && !x.hidden)
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(x => Object.assign({}, x, { updatedAt: new Date(x.updatedAt) }))
    .map(shopTemplate);
}

export function main({ tableRoot, shopCards, extraData }) {
  rollbar.init();

  addEventListener("DOMContentLoaded", async e => {
    try {
      const data = await fetchDashboardV2Data(
        new Map(Object.entries(extraData))
      );
      tableRoot.innerHTML = null;
      console.log(data);
      render(tableTemplate(data), tableRoot);
      render(cardsTemplate(data), shopCards);
    } catch (ex) {
      console.error(ex);
    }
  });
}
