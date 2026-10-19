import { HttpCrawler, useState } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { parseHTML, parseXML } from "@hlidac-shopu/actors-common/dom.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { saveUniqProducts } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, LogLevel, log } from "apify";
import { Country, categoryLinks, extractDetail, listingItems, pageUrls, sitemapUrls, variantUrls } from "./extract.js";

/** @enum {string} */
const Labels = {
  SITEMAP_INDEX: "SITEMAP_INDEX",
  SITEMAP: "SITEMAP",
  CATEGORY: "CATEGORY",
  DETAIL: "DETAIL"
};

const rootUrlByCountry = new Map([
  [Country.CZ, "https://www.mountfield.cz/predvypis"],
  [Country.SK, "https://www.mountfield.sk/predvypis"]
]);

// Category listings miss products filed directly under a parent category, categories not linked from
// the root, and all sizes and colours but one. The sitemap lists every product page, the ones no
// listing showed are scraped from their detail.
const sitemapIndexByCountry = new Map([
  [Country.CZ, "https://www.mountfield.cz/content/sitemaps/domain_1_sitemap.xml"],
  [Country.SK, "https://www.mountfield.sk/content/sitemaps/domain_2_sitemap.xml"]
]);

const testUrlByCountry = new Map([
  [Country.CZ, "https://www.mountfield.cz/cyklo-obleceni"],
  [Country.SK, "https://www.mountfield.sk/pily-prislusenstvo-retaze"]
]);

/** @param {string} url */
const detailRequest = url => ({ url, userData: { label: Labels.DETAIL } });

/**
 * return name of the table in keboola according the language
 * @param {{type: ActorType, country: Country}} userInput
 * @return {string}
 */
function getTableName({ type, country }) {
  const tableName = `mountfield_${country.toLowerCase()}`;
  if (type === ActorType.BlackFriday) {
    return `${tableName}_bf`;
  }
  return tableName;
}

async function main() {
  rollbar.init();

  const processedIds = await useState("processedIds", {});
  // URLs of the products saved from listings and of the visited listings, and of the sitemap pages
  const listedUrls = await useState("listedUrls", {});
  const sitemapPages = await useState("sitemapPages", {});
  const stats = await withPersistedStats({
    sitemaps: 0,
    categories: 0,
    listingItems: 0,
    details: 0,
    otherPages: 0,
    items: 0,
    itemsDuplicity: 0
  });

  const {
    development,
    debug,
    maxRequestRetries,
    proxyGroups,
    country = Country.CZ,
    type = ActorType.Full,
    bfUrl = "https://www.mountfield.cz/black-friday"
  } = await getInput();

  if (development || debug) {
    log.setLevel(LogLevel.DEBUG);
  }

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    // Cloudflare answers 403 to residential IPs from other countries; CZECH_LUMINATI has Czech IPs only
    countryCode: proxyGroups?.includes("RESIDENTIAL") ? country : undefined,
    useApifyProxy: !development
  });

  const failedSitemaps = [];
  const crawler = new HttpCrawler({
    maxRequestsPerMinute: 400,
    maxRequestRetries,
    useSessionPool: true,
    persistCookiesPerSession: true,
    proxyConfiguration,
    additionalMimeTypes: ["application/xml", "text/xml"],
    async requestHandler({ request, body, crawler }) {
      const {
        url,
        loadedUrl,
        userData: { label }
      } = request;
      log.debug(`Scraping [${label}] - ${url}`);

      switch (label) {
        case Labels.SITEMAP_INDEX: {
          const { document } = parseXML(body.toString());
          const sitemaps = sitemapUrls(document);
          if (!sitemaps.length) throw new Error(`No sitemaps in the sitemap index ${url}`);
          stats.add("sitemaps", sitemaps.length);
          await crawler.addRequests(sitemaps.map(url => ({ url, userData: { label: Labels.SITEMAP } })));
          break;
        }
        case Labels.SITEMAP: {
          const { document } = parseXML(body.toString());
          const pages = pageUrls(document);
          if (!pages.length) throw new Error(`No pages in the sitemap ${url}`);
          log.info(`Found ${pages.length} pages in ${url}`);
          for (const page of pages) sitemapPages[page] = true;
          break;
        }
        case Labels.CATEGORY: {
          const { document } = parseHTML(body.toString());
          const { categories, variants, nextPage } = categoryLinks(document, loadedUrl ?? url);
          const products = listingItems(document, country);
          listedUrls[url] = true;
          if (loadedUrl) listedUrls[loadedUrl] = true;
          for (const product of products) listedUrls[product.itemUrl] = true;
          stats.add("categories", categories.length);
          stats.add("listingItems", products.length);
          stats.add("items", products.length);
          await saveUniqProducts({ products, stats, processedIds });
          await crawler.addRequests([
            ...categories.map(url => ({ url, userData: { label: Labels.CATEGORY } })),
            ...(nextPage ? [{ url: nextPage, userData: { label: Labels.CATEGORY } }] : []),
            // FULL gets the other sizes and colours from the sitemap
            ...(type === ActorType.Full ? [] : variants.map(detailRequest))
          ]);
          break;
        }
        case Labels.DETAIL: {
          const { document } = parseHTML(body.toString());
          const product = extractDetail(document, country, loadedUrl ?? url);
          if (!product) {
            // sitemaps list articles, stores and other pages too
            stats.inc("otherPages");
            return;
          }
          stats.inc("details");
          stats.inc("items");
          await saveUniqProducts({ products: [product], stats, processedIds });
          if (type !== ActorType.Full) await crawler.addRequests(variantUrls(document).map(detailRequest));
          break;
        }
      }
    },
    async failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      if ([Labels.SITEMAP_INDEX, Labels.SITEMAP].includes(request.userData.label)) failedSitemaps.push(request.url);
    }
  });

  const startingRequests = [];
  switch (type) {
    case ActorType.Full:
      startingRequests.push(
        { url: rootUrlByCountry.get(country), userData: { label: Labels.CATEGORY } },
        { url: sitemapIndexByCountry.get(country), userData: { label: Labels.SITEMAP_INDEX } }
      );
      break;
    case ActorType.BlackFriday:
      startingRequests.push({ url: bfUrl, userData: { label: Labels.CATEGORY } });
      break;
    case ActorType.Test:
      startingRequests.push({ url: testUrlByCountry.get(country), userData: { label: Labels.CATEGORY } });
      break;
  }
  await crawler.run(startingRequests);

  if (type === ActorType.Full) {
    // without the whole sitemap the products missing from listings would silently drop out again
    if (failedSitemaps.length) throw new Error(`Sitemaps failed to load: ${failedSitemaps.join(", ")}`);
    const unlisted = Object.keys(sitemapPages).filter(url => !listedUrls[url]);
    if (!unlisted.length) throw new Error("No sitemap pages to scrape - sitemap failed to load or changed");
    log.info(`Scraping ${unlisted.length} sitemap pages no listing showed`);
    // keep the request queue, so a restarted run continues where it was and does not refetch the listings
    await crawler.run(unlisted.map(detailRequest), { purgeRequestQueue: false });
  }

  await stats.save(true);

  if (!development) {
    const tableName = getTableName({ type, country });
    await uploadToKeboola(tableName);
  }
  log.info("Finished.");
}

await Actor.main(main);
