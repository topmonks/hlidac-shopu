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
      id="${shop}">
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
              <svg class="radial-progress" data-percentage="{inSale}" viewBox="0 0 80 80">
                <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                <circle class="complete" cx="40" cy="40" r="35" style="stroke-dashoffset: 39.58406743523136;"></circle>
                <text class="percentage" x="50%" y="57%" transform="matrix(0, 1, -1, 0, 80, 0)">
                  ${formatPercents(inSale) ?? "-"}
                </text>
              </svg>
            </dd>
          </dl>
          <dl class="hs-metrics__item">
            <dt>slevy nesedí</dt>
            <dd>
              <svg class="radial-progress" data-percentage="${formatPercents(weDontAgree) ?? "-"}" viewBox="0 0 80 80">
                <circle class="incomplete" cx="40" cy="40" r="35"></circle>
                <circle class="complete" cx="40" cy="40" r="35" style="stroke-dashoffset: 39.58406743523136;"></circle>
                <text class="percentage" x="50%" y="57%" transform="matrix(0, 1, -1, 0, 80, 0)">
                  ${formatPercents(weDontAgree) ?? "-"}
                </text>
              </svg>
            </dd>
          </dl>
          <script src="https://code.jquery.com/jquery-3.3.1.min.js"
                  integrity="sha384-tsQFqpEReu7ZLhBV2VZlAu7zcOV+rXbYlF2cqB8txI/8aZajjp4Bqd+V6D5IgvKT"
                  crossorigin="anonymous">
          </script>
          <script>
            $('svg.radial-progress').each(function(index, value) {
              $(this).find($('circle.complete')).removeAttr('style');
            });

            $(window).scroll(function() {
              $('svg.radial-progress').each(function(index, value) {
                // If svg.radial-progress is approximately 25% vertically into the window when scrolling from the top or the bottom
                if (
                  $(window).scrollTop() > $(this).offset().top - ($(window).height() * 0.75) &&
                  $(window).scrollTop() < $(this).offset().top + $(this).height() - ($(window).height() * 0.25)
                ) {
                  // Get percentage of progress
                  percent = $(value).data('percentage');
                  // Get radius of the svg's circle.complete
                  radius = $(this).find($('circle.complete')).attr('r');
                  // Get circumference (2πr)
                  circumference = 2 * Math.PI * radius;
                  // Get stroke-dashoffset value based on the percentage of the circumference
                  strokeDashOffset = circumference - ((percent * circumference) / 100);
                  // Transition progress for 1.25 seconds
                  $(this).find($('circle.complete')).animate({ 'stroke-dashoffset': strokeDashOffset }, 1250);
                }
              });
            }).trigger('scroll');
          </script>
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
