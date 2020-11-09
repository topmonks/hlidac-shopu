import { render, html, svg } from "lit-html";
import { classMap } from "lit-html/directives/class-map.js";
import { formatPercents } from "@hlidac-shopu/lib/format.js";
import { getShop } from "./helpers.mjs";
import "./shops/index.mjs";

const toCssString = obj =>
  Object.entries(obj)
    .map(([key, value]) => `${key}:${value};`)
    .join("");

const logo = svg`
  <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="21" cy="21" r="20.5" fill="white" stroke="#EDF3FA"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M9.03844 15.1819H34.9616C36.0874 15.1819 37 16.1072 37 17.2285V18.5898C37 19.6988 36.12 20.6017 35.0251 20.6355L32.8605 30.3761C32.5456 31.7934 31.1637 32.9092 29.7147 32.9092H28.1435H16H14.4289C12.9798 32.9092 11.598 31.7934 11.283 30.3761L9.11865 20.6364H9.03844C7.91264 20.6364 7 19.7111 7 18.5898V17.2285C7 16.0982 7.91422 15.1819 9.03844 15.1819ZM16.9732 31.5455H27.1703H29.7147C30.5228 31.5455 31.3527 30.8754 31.5294 30.0803L33.628 20.6364H10.5155L12.6142 30.0803C12.7909 30.8754 13.6208 31.5455 14.4289 31.5455H16.9732ZM8.36364 18.5898C8.36364 18.9633 8.67099 19.2728 9.03844 19.2728H34.9616C35.3322 19.2728 35.6364 18.9675 35.6364 18.5898V17.2285C35.6364 16.855 35.329 16.5455 34.9616 16.5455H9.03844C8.66785 16.5455 8.36364 16.8508 8.36364 17.2285V18.5898Z" fill="#545FEF"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M21.0987 8.18282C21.3754 7.92741 21.3927 7.49605 21.1373 7.21936C20.8819 6.94266 20.4505 6.92541 20.1738 7.18082L11.3102 15.3626C11.0335 15.618 11.0162 16.0494 11.2716 16.3261C11.5271 16.6028 11.9584 16.6201 12.2351 16.3646L21.0987 8.18282Z" fill="#545FEF"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M23.8259 7.18082C23.5492 6.92541 23.1179 6.94266 22.8625 7.21936C22.607 7.49605 22.6243 7.92741 22.901 8.18282L31.7646 16.3646C32.0413 16.6201 32.4727 16.6028 32.7281 16.3261C32.9835 16.0494 32.9663 15.618 32.6896 15.3626L23.8259 7.18082Z" fill="#545FEF"/>
    <path d="M21.6354 23.9718C21.6354 24.2583 21.5851 24.5198 21.4844 24.7562C21.3837 24.9926 21.25 25.1968 21.0833 25.3687C20.9167 25.537 20.7222 25.6678 20.5 25.7609C20.2812 25.854 20.0521 25.9006 19.8125 25.9006C19.5486 25.9006 19.3056 25.854 19.0833 25.7609C18.8646 25.6678 18.6736 25.537 18.5104 25.3687C18.3507 25.1968 18.2257 24.9926 18.1354 24.7562C18.0451 24.5198 18 24.2583 18 23.9718C18 23.6745 18.0451 23.4059 18.1354 23.1659C18.2257 22.9223 18.3507 22.7146 18.5104 22.5426C18.6736 22.3707 18.8646 22.2382 19.0833 22.1451C19.3056 22.0484 19.5486 22 19.8125 22C20.0764 22 20.3194 22.0484 20.5417 22.1451C20.7674 22.2382 20.9601 22.3707 21.1198 22.5426C21.283 22.7146 21.4097 22.9223 21.5 23.1659C21.5903 23.4059 21.6354 23.6745 21.6354 23.9718ZM20.3958 23.9718C20.3958 23.7891 20.3802 23.6387 20.349 23.5205C20.3212 23.3987 20.2812 23.302 20.2292 23.2304C20.1771 23.1587 20.1146 23.1086 20.0417 23.0799C19.9722 23.0513 19.8958 23.0369 19.8125 23.0369C19.7292 23.0369 19.6528 23.0513 19.5833 23.0799C19.5139 23.1086 19.4549 23.1587 19.4063 23.2304C19.3576 23.302 19.3194 23.3987 19.2917 23.5205C19.2639 23.6387 19.25 23.7891 19.25 23.9718C19.25 24.1437 19.2639 24.287 19.2917 24.4016C19.3194 24.5162 19.3576 24.6076 19.4063 24.6756C19.4549 24.7437 19.5139 24.792 19.5833 24.8207C19.6528 24.8493 19.7292 24.8637 19.8125 24.8637C19.8958 24.8637 19.9722 24.8493 20.0417 24.8207C20.1146 24.792 20.1771 24.7437 20.2292 24.6756C20.2812 24.6076 20.3212 24.5162 20.349 24.4016C20.3802 24.287 20.3958 24.1437 20.3958 23.9718ZM24.0208 22.3224C24.0729 22.2615 24.1372 22.206 24.2135 22.1558C24.2899 22.1021 24.3958 22.0752 24.5312 22.0752H25.7083L19.9896 29.6669C19.9375 29.7349 19.8715 29.7923 19.7917 29.8388C19.7153 29.8818 19.6215 29.9033 19.5104 29.9033H18.3021L24.0208 22.3224ZM26 28.0658C26 28.3524 25.9497 28.6156 25.849 28.8556C25.7483 29.092 25.6146 29.2962 25.4479 29.4681C25.2812 29.6364 25.0868 29.7672 24.8646 29.8603C24.6458 29.9534 24.4167 30 24.1771 30C23.9132 30 23.6701 29.9534 23.4479 29.8603C23.2292 29.7672 23.0382 29.6364 22.875 29.4681C22.7153 29.2962 22.5903 29.092 22.5 28.8556C22.4097 28.6156 22.3646 28.3524 22.3646 28.0658C22.3646 27.7685 22.4097 27.4999 22.5 27.2599C22.5903 27.0163 22.7153 26.8086 22.875 26.6367C23.0382 26.4647 23.2292 26.3322 23.4479 26.2391C23.6701 26.1424 23.9132 26.094 24.1771 26.094C24.441 26.094 24.684 26.1424 24.9062 26.2391C25.1319 26.3322 25.3247 26.4647 25.4844 26.6367C25.6476 26.8086 25.7743 27.0163 25.8646 27.2599C25.9549 27.4999 26 27.7685 26 28.0658ZM24.7604 28.0658C24.7604 27.8867 24.7448 27.7381 24.7135 27.6199C24.6858 27.4981 24.6458 27.4014 24.5938 27.3298C24.5417 27.2581 24.4792 27.208 24.4063 27.1793C24.3368 27.1507 24.2604 27.1363 24.1771 27.1363C24.0938 27.1363 24.0174 27.1507 23.9479 27.1793C23.8785 27.208 23.8194 27.2581 23.7708 27.3298C23.7222 27.4014 23.684 27.4981 23.6562 27.6199C23.6285 27.7381 23.6146 27.8867 23.6146 28.0658C23.6146 28.2377 23.6285 28.381 23.6562 28.4956C23.684 28.6103 23.7222 28.7016 23.7708 28.7696C23.8194 28.8377 23.8785 28.8861 23.9479 28.9147C24.0174 28.9434 24.0938 28.9577 24.1771 28.9577C24.2604 28.9577 24.3368 28.9434 24.4063 28.9147C24.4792 28.8861 24.5417 28.8377 24.5938 28.7696C24.6458 28.7016 24.6858 28.6103 24.7135 28.4956C24.7448 28.381 24.7604 28.2377 24.7604 28.0658Z" fill="#FF8787"/>
  </svg>
`;

function discountTemplate(metadata) {
  const discount = metadata.realDiscount;
  if (discount === null || isNaN(discount)) return null;

  const titles = new Map([
    [
      "eu-minimum",
      "Reálná sleva se počítá podle EU směrnice jako aktuální cena po slevě ku minimální ceně, za kterou se zboží prodávalo v období 30 dní před slevovou akcí."
    ],
    [
      "common-price",
      "Počítá se jako aktuální cena ku nejčastější ceně, za kterou se zboží prodávalo za posledních 90 dnů."
    ]
  ]);

  const discountLabel = x => {
    if (x > 0) {
      return "Podle nás sleva";
    } else if (x === 0) {
      return "Podle nás bez slevy";
    } else {
      return "Podle nás zdraženo";
    }
  };
  const discountClass = x => ({
    "hs-real-discount": true,
    "hs-real-discount--neutral": x === 0,
    "hs-real-discount--negative": x < 0
  });

  const title = titles.get(metadata.type);
  return html`
    <div class="${classMap(discountClass(discount))}">
      <b>
        <span>
          ${discount < 0 ? "↑" : discount > 0 ? "↓" : "="}
          ${formatPercents(Math.abs(discount))}
        </span>
      </b>
      <a
        href="https://www.hldacshopu.cz/metodika/"
        target="_blank"
        rel="noopener"
        title="${title}"
      >
        ${discountLabel(discount)}
      </a>
    </div>
  `;
}

function widgetTemplate(data, metadata) {
  const params = new URLSearchParams({ url: location.href });
  const permalink = `https://www.hlidacshopu.cz/app/?${params}`;
  return html`
    <div id="hlidacShopu">
      <style>
        #hlidacShopu .hs-header {
          background: #fff;
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          position: static;
          width: initial;
        }
        #hlidacShopu .hs-header > :first-child {
          flex-grow: 2;
        }
        #hlidacShopu .hs-header .hs-logo {
          margin-right: 16px;
          float: left;
        }
        #hlidacShopu .hs-header .hs-h4 {
          margin: 0;
          color: #000;
          font-size: 14px;
          line-height: 20px;
          font-weight: 400;
        }
        #hlidacShopu .hs-footer {
          display: flex;
          justify-content: space-between;
          padding-bottom: initial;
          margin-bottom: initial;
          background: initial;
          width: initial;
        }
        #hlidacShopu .hs-footer div {
          font-size: 10px;
          color: #979797;
        }
        #hlidacShopu .hs-footer a {
          color: #545fef;
        }
        #hlidacShopu .hs-legend {
          display: flex;
          flex-flow: wrap;
          line-height: 20px;
          align-items: center;
          color: #939393;
          font-size: 13px;
          margin: initial;
        }
        #hlidacShopu .hs-legend__item {
          margin-right: 10px;
        }
        #hlidacShopu .hs-legend__item-color {
          display: inline-block;
          width: 12px;
          height: 12px;
          border-radius: 2px;
          margin-right: 5px;
        }
        #hlidacShopu .hs-real-discount {
          align-self: flex-start;
          background-color: #ffe607;
          color: #1d3650;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          line-height: 16px;
          padding: 6px 10px 6px;
          margin-left: 16px;
        }
        #hlidacShopu .hs-real-discount.hs-real-discount--negative {
          background-color: #ca0505;
          color: #fff;
        }
        #hlidacShopu .hs-real-discount.hs-real-discount--no-data {
          display: none;
        }
      </style>
      <div class="hs-header">
        <div>
          <a
            class="hs-logo"
            href="${permalink}"
            title="trvalý odkaz na vývoj ceny"
          >
            ${logo}
          </a>
        </div>
        ${discountTemplate(metadata)}
      </div>
      <div class="hs-footer">
        <div>
          Více informací na
          <a href="https://www.hlidacshopu.cz/">HlídačShopů.cz</a>
        </div>
        <div>
          Vytvořili <a href="https://www.apify.com/">Apify</a>,
          <a href="https://www.keboola.com/">Keboola</a>
          &amp; <a href="https://www.topmonks.com/">TopMonks</a>
        </div>
      </div>
    </div>
  `;
}

function getVersion() {
  return (chrome || browser).runtime.getManifest().version;
}

function fetchData(url, info) {
  const searchString = new URLSearchParams(
    Object.entries(info).filter(([, val]) => Boolean(val))
  );
  searchString.append("url", url);
  searchString.append("ext", getVersion());
  return fetch(`https://api2.hlidacshopu.cz/detail?${searchString}`).then(
    resp => {
      if (resp.status === 404) {
        return resp.json();
      }
      if (!resp.ok) {
        throw new Error("HTTP error, status = " + resp.status);
      }
      return resp.json();
    }
  );
}

const renderRoot = document.createElement("div");
const basicStyles = {
  "font-family": "Montserrat, sans-serif",
  "font-size": "16px",
  "background-color": "#fff",
  "border": "1px solid #E8E8E8",
  "border-radius": "14px",
  "margin": "16px 0",
  "padding": "16px",
  "clear": "both"
};

function renderHTML(repaint, shop, data, metadata) {
  if (!repaint) {
    shop.inject(styles => {
      renderRoot.setAttribute(
        "style",
        toCssString(Object.assign({}, basicStyles, styles))
      );
      return renderRoot;
    });
  }
  render(widgetTemplate(data, metadata), renderRoot);
}

function injectFont() {
  const fontImport = document.createElement("link");
  fontImport.rel = "stylesheet";
  fontImport.href =
    "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap";
  document.head.insertAdjacentElement("beforeend", fontImport);
}

function handleDetail(shop) {
  shop.scheduleRendering(async repaint => {
    try {
      const info = await shop.scrape();
      if (!info) {
        // we don't understand this page
        return false;
      }

      const url = info.url || location.href;
      const res = await fetchData(url, info);
      if (res.error || (res.metadata && res.metadata.error)) {
        console.error("Error fetching data: ", res.error || res.metadata.error);
        return false;
      }
      if (!res.data || res.data.length === 0) {
        console.error("No data found:", res);
        return false;
      }

      const { itemId } = info;
      console.log(`Chart loaded for ItemID: ${itemId}`);
      console.log({ info, metadata: res.metadata, dataset: res.data });

      renderHTML(repaint, shop, res.data, res.metadata);

      const params = new URLSearchParams({ url, itemId, debug: 1 });
      console.log(`https://www.hlidacshopu.cz/app/?${params}`);
      return true;
    } catch (e) {
      console.error(e);
      return false;
    } finally {
      console.groupEnd();
    }
  });
}

async function main() {
  console.group("Hlídačshopů.cz");
  console.log(`version: %c${getVersion()}`, "font-weight: 700");
  const shop = getShop(location.href);
  if (!shop) {
    console.log("No shop found");
    console.groupEnd();
    return;
  }
  injectFont();
  handleDetail(shop);
}

main().catch(err => console.error(err));
