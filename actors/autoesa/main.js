import { Dataset, HttpCrawler, createHttpRouter } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { map, push, range, transduce } from "@thi.ng/transducers";
import { Actor, LogLevel, log } from "apify";

const BASE_URL = "https://www.autoesa.cz";
const BASE_CATEGORY = "vsechna-auta";

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

  const value = match[0].replace(/\s/g, "").replace("Cena", "");
  return cleanPrice(value, 10);
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
  const { pathname } = new URL(url);
  const itemId = pathname.split("/").at(-1);

  const img = document.querySelector(".car-gallery a")?.href;

  const item = document.querySelector(".initCarDetail.car-detail2");
  const topLineLeft = item?.querySelector(".car_detail2__topline__left");
  const topLineRight = item?.querySelector(".car_detail2__topline__wrapper");

  const itemName = topLineLeft?.querySelector(".car_detail2__h1 h1")?.innerText.trim();

  const features = topLineLeft?.querySelector(".car_detail2__icons_line");
  const year = features?.querySelector(".icon_year")?.innerHTML.trim();
  const fuelType = features?.querySelector(".icon_fuel")?.innerHTML.trim();
  const range = removeHtmlEntities(features?.querySelector(".icon_range")?.innerHTML.trim() || "");
  const power = removeHtmlEntities(features?.querySelector(".icon_power")?.innerHTML.trim() || "");

  const discount = topLineRight?.querySelector(".show-more-discount span")?.innerText.trim();
  const discountedPrice = discount ? extractPrice(discount) : undefined;
  const pricesElements = topLineRight?.querySelectorAll(".show-more-prices .show-more-price");
  const prices = [];
  for (const price of pricesElements) {
    const value = price.querySelector(".price_span")?.innerHTML || price.querySelector("strong")?.innerText;
    if (!value) continue;
    const extracted = extractPrice(value);
    if (!extracted) continue;

    if (price.innerHTML.trim().includes("Původní cena")) {
      prices.push({ discount: true, price: extracted });
    } else if (price.innerHTML.trim().includes("Cena v hotovosti")) {
      prices.push({ discount: false, price: extracted });
    }
  }

  const currentPrice = prices.find(price => !price.discount)?.price ?? null;
  const originalPrice = prices.find(price => price.discount)?.price ?? null;

  return {
    slug: itemId,
    itemId,
    itemName,
    itemUrl: url,
    img: img ? `${BASE_URL}${img}` : null,
    currentPrice,
    originalPrice,
    currency: "CZK",
    discounted: !!discountedPrice,
    year,
    km: range,
    fuelType,
    power
  };
}

function defRouter({ stats, type }) {
  return createHttpRouter({
    /** @param {HttpCrawlingContext} ctx */
    async start({ crawler, body }) {
      const pages = extractTotalPages(body.toString());
      const requests = transduce(
        map(pageNumber => ({
          url: getPageUrl(pageNumber, type, BASE_CATEGORY),
          headers: { "x-requested-with": "XMLHttpRequest" },
          label: "page",
          userData: { pageNumber }
        })),
        push(),
        range(1, pages + 1)
      );
      await crawler.addRequests(requests);
    },
    /** @param {HttpCrawlingContext} ctx */
    async page({ crawler, body }) {
      const snippet = extractSnippet(body.toString(), "snippet--carList");
      const { document } = parseHTML(snippet);
      const requests = transduce(
        map(item => {
          const url = new URL(item.getAttribute("href"), BASE_URL).href;
          return { url, label: "detail" };
        }),
        push(),
        document.querySelectorAll(".car_item")
      );
      await crawler.addRequests(requests);
    },
    /** @param {HttpCrawlingContext} ctx */
    async detail({ request, body }) {
      const { document } = parseHTML(body.toString());
      stats.inc("products");
      await Dataset.pushData(toProduct(document, request.url));
    }
  });
}

async function main() {
  Rollbar.init();

  const { debug, development, maxRequestRetries, type = ActorType.Full, proxyGroups, urls } = await getInput();

  if (debug) {
    log.setLevel(LogLevel.DEBUG);
  }
  const stats = await withPersistedStats(x => x, {
    products: 0,
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
    requestHandler: defRouter({ stats, type }),
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  await crawler.run(
    urls.length
      ? urls
      : [
          {
            url: getRootUrl(type),
            headers: { "x-requested-with": "XMLHttpRequest" },
            label: "start"
          }
        ]
  );

  await uploadToKeboola("autoesa_cz");
}

await Actor.main(main, { statusMessage: "DONE" });
