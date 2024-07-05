import { formatNumber, formatPercents, formatShortDate } from "@hlidac-shopu/lib/format.mjs";
import { fetchDashboardV2Data } from "@hlidac-shopu/lib/remoting.mjs";
import { rating, ratingStyles } from "@hlidac-shopu/lib/templates.mjs";
import { html, render, svg } from "lit";
import { unsafeHTML } from "lit-html/directives/unsafe-html.js";
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

function radialProgress({ ratio, isMonochrome }) {
  const circumference = 2 * Math.PI * 35;
  const strokeDashOffset = circumference - ratio * circumference;
  const color = ratio <= 0.1 && !isMonochrome ? "#27AE60" : ratio >= 0.7 && !isMonochrome ? "#C62828" : "#5C62CD";
  return svg`
    <svg class="radial-progress" viewBox="0 0 80 80">
      <circle class="incomplete" cx="40" cy="40" r="35"></circle>
      <circle class="complete" cx="40" cy="40" r="35" style="stroke-dashoffset: ${strokeDashOffset}; --stroke-color: ${color}"></circle>
      <text class="percentage" x="50%" y="57%" transform="matrix(0, 1, -1, 0, 80, 0)">
        ${formatPercents(ratio) ?? "-"}
      </text>
    </svg>
  `;
}

function cardTemplate({ name, shop, inSale, weDontAgree, rating: ratingValue, body }) {
  return html`
    <div
      class="hs-card hs-card--with-metrics mdc-layout-grid__cell mdc-layout-grid__cell--span-6"
      id="summary-${shop}"
    >
      <a href="#row-${shop}" title="Zobrazit detail v tabulce">
        <h3>${name} ${rating(ratingValue, { maxValue: 3 }) ?? "-"}</h3>
        <div class="hs-metrics">
          <dl class="hs-metrics__item">
            <dt>produktů ve slevě</dt>
            <dd>
              <data value="${inSale}"
                >${radialProgress({ ratio: inSale, isMonochrome: true })}
              </data>
            </dd>
          </dl>
          <dl class="hs-metrics__item">
            <dt>slevy nesedí</dt>
            <dd>
              <data value="${weDontAgree}"
                >${radialProgress({ ratio: weDontAgree })}
              </data>
            </dd>
          </dl>
        </div>
        ${unsafeHTML(body)}
      </a>
    </div>
  `;
}

function cardsTemplate(data) {
  return html`<style>
      ${ratingStyles()}
    </style>
    ${data
      .filter(x => x.allProducts && !x.hidden)
      .map(x =>
        Object.assign({}, x, {
          inSale: x.bfProducts / x.allProducts,
          weDontAgree: x.bfProducts !== 0 ? x.misleadingCount / x.bfProducts : 0
        })
      )
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(cardTemplate)}`;
}

function shopTemplate({
  shop,
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
  link,
  rating: ratingValue
}) {
  return html`
    <tr class="dashboard-row" id="row-${shop}">
      <th scope="row">${logoTemplate({ name, url, logo, viewBox })}</th>
      <td><data value="${allProducts}">${formatNumber(allProducts)}</data></td>
      <td>
        <data value="${bfProducts}">${formatNumber(bfProducts) ?? "-"}</data>
      </td>
      <td>
        <data value="${avgClaimedDiscount}"
          >${formatPercents(avgClaimedDiscount) ?? "-"}</data
        >
      </td>
      <td>
        <data value="${avgRealDiscount}"
          >${formatPercents(avgRealDiscount) ?? "-"}</data
        >
      </td>
      <td>
        <data value="${misleadingCount}"
          >${formatNumber(misleadingCount) ?? "-"}</data
        >
      </td>
      <td>
        <time datetime="${updatedAt.toISOString()}"
          >${formatShortDate(updatedAt) ?? "-"}
        </time>
      </td>
      <td>${rating(ratingValue, { maxValue: 3 }) ?? "-"}</td>
      <td>
        <a href="${link}" target="sheets" title="Otevřít data v Google Sheets">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            style="width: 24px"
          >
            <path fill="none" d="M0 0h24v24H0z" />
            <path
              d="M19 7H9a2 2 0 0 0-2 2v10c0 1.1.9 2 2 2h10a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zm0 2v2H9V9h10zm-6 6v-2h2v2h-2zm2 2v2h-2v-2h2zm-4-2H9v-2h2v2zm6-2h2v2h-2v-2zm-8 4h2v2H9v-2zm8 2v-2h2v2h-2zM6 17H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v1h-2V5H5v10h1v2z"
            />
          </svg>
        </a>
      </td>
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

export async function main({ tableRoot, shopCards, extraData }) {
  rollbar.init();

  try {
    const data = await fetchDashboardV2Data(new Map(Object.entries(extraData)));
    tableRoot.innerHTML = null;
    render(tableTemplate(data), tableRoot);
    render(cardsTemplate(data), shopCards);
  } catch (ex) {
    console.error(ex);
  }
}
