import { Dataset, HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { default as Rollbar } from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { Actor, log } from "apify";

const BASE_URL = "https://www.autoesa.cz";
const BASE_CATEGORY = "vsechna-auta";

const CURRENCY = {
  CZK: "CZK"
};

const CURRENCIES = {
  [CURRENCY.CZK]: {
    label: "Kč"
  }
};

/** @enum */
const LABEL = {
  START: "start",
  PAGE: "page",
  DETAIL: "detail"
};

function getRootUrl(type = ActorType.Full, category = BASE_CATEGORY) {
  return getPageUrl(1, type, category);
}

function getPageUrl(page, type = ActorType.Full, category = BASE_CATEGORY) {
  const root = `${BASE_URL}/${category}/?stranka=${page}`;

  switch (type) {
    case ActorType.Full:
      return root;
    default:
      throw new Error(`Unsupported actor type ${type}`);
  }
}

function removeHtmlEntities(str) {
  return str.replace(/&[#a-zA-Z0-9]+;/g, "");
}

function extractPrice(priceStr) {
  if (!priceStr) return;
  priceStr = removeHtmlEntities(priceStr);
  const match = priceStr.match(/[\d*\s]*Kč/g);
  if (!match) return;

  const value = match[0].replace(/\s/g, "").replace("Kč", "").replace("€", "").replace("Cena", "");
  return parseInt(value, 10);
}

function extractSnippet(body, snippetId) {
  const content = JSON.parse(body);
  return content.snippets[snippetId];
}

function extractTotalPages(body) {
  const snippet = extractSnippet(body, "snippet--paginationBottom");
  const { document } = parseHTML(snippet);
  const lastPage = document.querySelector(".dots-last a");
  return lastPage ? parseInt(lastPage.textContent.match(/\d+/)[0], 10) : 0;
}

function toProduct(document, url) {
  const itemId = new URL(url).pathname.split("/").pop();

  const img = document.querySelector(".car-gallery")?.querySelector("a")?.getAttribute("href");

  const item = document.querySelector(".initCarDetail.car-detail2");
  const topLineLeft = item?.querySelector(".car_detail2__topline__left");
  const topLineRight = item?.querySelector(".car_detail2__topline__wrapper");

  const itemName = topLineLeft?.querySelector(".car_detail2__h1")?.querySelector("h1")?.innerText.trim();

  const features = topLineLeft?.querySelector(".car_detail2__icons_line");
  const year = features?.querySelector(".icon_year")?.innerHTML.trim();
  const fuelType = features?.querySelector(".icon_fuel")?.innerHTML.trim();
  const range = removeHtmlEntities(features?.querySelector(".icon_range")?.innerHTML.trim() || "");
  const power = removeHtmlEntities(features?.querySelector(".icon_power")?.innerHTML.trim() || "");

  const discount = topLineRight?.querySelector(".show-more-discount")?.querySelector("span")?.innerText.trim();
  const discountedPrice = discount ? extractPrice(discount) : undefined;
  const pricesElements = topLineRight?.querySelector(".show-more-prices")?.querySelectorAll(".show-more-price");
  const prices = [];
  pricesElements?.forEach(price => {
    const value = price.querySelector(".price_span")?.innerHTML || price.querySelector("strong")?.innerText;
    if (!value) return;
    const extracted = extractPrice(value);
    if (!extracted) return;

    if (price.innerHTML.trim().includes("Původní cena")) {
      prices.push({ discount: true, price: extracted });
    } else if (price.innerHTML.trim().includes("Cena v hotovosti")) {
      prices.push({ discount: false, price: extracted });
    }
  });

  const currentPrice = prices.find(price => !price.discount)?.price;
  const originalPrice = prices.find(price => price.discount)?.price;

  return {
    itemUrl: url,
    itemId,
    img: img ? `${BASE_URL}${img}` : null,
    itemName,
    currentPrice,
    originalPrice,
    currency: CURRENCIES[CURRENCY.CZK].label,
    discounted: !!discountedPrice,
    year,
    km: range,
    fuelType,
    power
  };
}

async function main() {
  const rollbar = Rollbar.init();

  const { development, maxRequestRetries, type = ActorType.Full, proxyGroups } = await getInput();

  const stats = await withPersistedStats(x => x, {
    urls: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestRetries,
    maxRequestsPerMinute: 200,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 20
    },
    persistCookiesPerSession: true,
    requestHandlerTimeoutSecs: 300,
    navigationTimeoutSecs: 300,
    async requestHandler({ request, body }) {
      const { label } = request.userData;
      log.info(`Label: ${label} - Scraping page ${request.url}`);
      switch (label) {
        case LABEL.START:
          {
            const pages = extractTotalPages(body.toString());
            const requests = [];
            for (let i = 0; i < pages; i++) {
              const pageNumber = i + 1;
              requests.push({
                url: getPageUrl(pageNumber, type, BASE_CATEGORY),
                headers: {
                  "x-requested-with": "XMLHttpRequest"
                },
                userData: { label: LABEL.PAGE, pageNumber }
              });
            }
            await crawler.requestQueue?.addRequests(requests);
          }
          break;
        case LABEL.PAGE:
          {
            const snippet = extractSnippet(body.toString(), "snippet--carList");
            const { document } = parseHTML(snippet);
            const offers = document.querySelectorAll(".car_item");
            const requests = [];
            offers.forEach(item => {
              const link = item.getAttribute("href");
              const url = link ? `${BASE_URL}${link}` : null;
              if (url) {
                requests.push({
                  url,
                  userData: { label: LABEL.DETAIL }
                });
              }
            });
            await crawler.requestQueue?.addRequests(requests);
          }
          break;
        case LABEL.DETAIL:
          {
            const { document } = parseHTML(body.toString());
            const product = toProduct(document, request.url);
            await Dataset.pushData(product);
          }
          break;
        default:
          throw new Error(`Unsupported label ${label}`);
      }
      stats.inc("urls");
    },
    async failedRequestHandler({ request }, error) {
      rollbar.error(error, request);
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await crawler.run([
    {
      url: getRootUrl(type),
      headers: { "x-requested-with": "XMLHttpRequest" },
      label: LABEL.START
    }
  ]);
  log.info("Crawler finished");

  await uploadToKeboola("autoesa_cz");
}

await Actor.main(main, { statusMessage: "DONE" });
