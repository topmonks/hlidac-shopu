import { formatDate, formatMoney } from "@hlidac-shopu/lib/format.mjs";
import { templateData } from "@hlidac-shopu/lib/remoting.mjs";
import { shops } from "@hlidac-shopu/lib/shops.mjs";
import { discountTemplate, logoTemplate, originalPriceTemplate, when } from "@hlidac-shopu/lib/templates.mjs";
import { html } from "lit-html";
import "@hlidac-shopu/lib/web-components/chart.mjs";

if (typeof ResizeObserver === "undefined") {
  const polyfill = document.createElement("script");
  polyfill.src = "https://cdn.jsdelivr.net/npm/resize-observer-polyfill@1.5.1/dist/ResizeObserver.global.min.js";
  document.head.insertAdjacentElement("beforeend", polyfill);
}

export function renderResults({ detailUrl, chartData, isEmbed }) {
  return resultTemplate(templateData(detailUrl, chartData), isEmbed);
}

function resultTemplate(
  {
    detailUrl,
    imageUrl,
    name,
    shop,
    lastDeclaredPrice,
    actualPrice,
    claimedDiscount,
    discount,
    discountType,
    date,
    data,
    ...prices
  },
  isEmbed
) {
  const crawlDate = x =>
    when(
      x,
      () => html`
        <time
          id="latest-date"
          datetime="${x.toISOString()}"
          title="Datum posledního čtení cen"
          >${formatDate(x)}
        </time>
      `
    );
  const shopLogo = x => x && logoTemplate(x);
  return html`
    <article
      vocab="https://schema.org/"
      typeof="Product"
      id="hlidac-shopu-modal__found"
      class="layout-wrapper"
    >
      <h2 property="name">
        ${shopLogo(shops.get(shop))}
        <a
          property="url"
          href="${detailUrl}"
          id="product-name"
          class="product-name"
          target="_blank"
          rel="noopener noreferrer"
          >${name || "Vámi vybraný produkt"}</a
        >
        ${when(imageUrl, () => html`<img property="image" alt="${name}" src="${imageUrl}" />`)}
      </h2>
      <div property="offers" typeof="Offer" class="box box--purple">
        ${crawlDate(date)}
        ${when(discount !== 0, () => originalPriceTemplate({ type: discountType, ...prices }))}
        <div class="hs-actual-price">
          Prodejní cena
          <span id="current-price" property="price" content="${actualPrice}"
            >${formatMoney(actualPrice)}</span
          >
        </div>
        ${discountTemplate(
          {
            realDiscount: discount,
            type: discountType,
            claimedDiscount
          },
          true
        )}
      </div>
      <div class="hs-chart">
        <hs-chart .data="${data}"></hs-chart>
      </div>
      ${when(
        isEmbed || !navigator.share,
        () => html`
          <div class="hs-share-buttons">
            <a
              class="tw-button"
              href="${`https://twitter.com/intent/tweet?url=${encodeURIComponent(location.href)}&hashtags=hlidacshopu`}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <i></i>
              <span>Tweet</span>
            </a>
            <a
              class="fb-button"
              href="${`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}`}"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                class="img"
                style="vertical-align:middle"
                src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QA/4ePzL8AAAAHdElNRQfjBBYGJDeRLlUUAAABp0lEQVRIx6WVu04bQRSG/x1jbZCR00RacAJYooksd/RI7qBJHiAlD5F2lQYhkSLFNrwFFVIaUsRRJEspSYnExcRFCguDE1F8FPaavczYXvinmZk955vLmT3HQxaV1dJ7NVRTTVJXXZ3qSCe6t9iSbQERfWzqExFk7dNDn5AB03RDiO8CBLSZR+3kPh7dm5zP5Q5wTjMLCAq4jxBBEuDzw2F4zyfe4lPmJWtspg7iPwJCh3uPrcytJxXGgMB58zu5IKcjEowAkcP9BE0FQIRE2fFs4MNMQJ+yUUtV2fV70tvVdRy1lKpquQ8Alcm6XadNZNSQS7eT3rLTpmFU02x5zi81jxstzXTDCRgYC90bt/xMPU8w6s1xhFhruZnecwF/jDrPAvwy+loAsJqbOfaoqKeK1Xx2FO70yuhWhwX2kNahhkK85r/1mbp+oVhDVpCRdKW9J61/oOu4Lizws/AOvrOQTKp1LgoBuqxm0/oGl3MDztiwFZZ6Jje7AB3euEpbiZB/UwFDPlJy10YhVvg8ztJZwF/2WZ9eXOO2yDZfEuNv7PGOFzbbB6Kd0fTJtKEiAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDE5LTA0LTIyVDEzOjM2OjU1LTA3OjAwi4nE0AAAACV0RVh0ZGF0ZTptb2RpZnkAMjAxOS0wNC0yMlQxMzozNjo1NS0wNzowMPrUfGwAAAAASUVORK5CYII="
                alt=""
                width="16"
                height="16"
              />
              <span>Sdílet</span>
            </a>
          </div>
        `
      )}
    </article>
  `;
}
