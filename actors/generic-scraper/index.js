import Apify from "apify";
import { fetch as originalFetch } from "@adobe/helix-fetch";
import retryFetch from "fetch-retry";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import WAE from "@rane/web-auto-extractor";
import { isEmpty, sort } from "ramda";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const { log } = Apify.utils;

const shuffle = sort(() => Math.random());

const fetch = retryFetch(originalFetch, {
  retryOn(attempt, error, response) {
    if (error !== null || response.status >= 400) {
      log.info(`retrying, attempt number ${attempt + 1}`);
      return attempt < 2;
    }
  },
  retryDelay(attempt, error, response) {
    return Math.pow(2, attempt) * 1000;
  }
});

async function checkUrl(url) {
  try {
    return (await fetch(url)).ok;
  } catch (e) {
    return false;
  }
}

async function getSitemapUrlFromRobotsTxt(domain) {
  const url = new URL("robots.txt", domain).href;
  const { body } = await Apify.utils.requestAsBrowser({
    url,
    headerGeneratorOptions: { locales: ["cs", "en"] }
  });
  const match = body.match(/Sitemap:\s*(.*)/);
  return match ? match[1].trim() : null;
}

function checkIfProduct(data) {
  const offers = data?.Product?.[0]?.offers;
  if (!offers) return false;
  return Boolean(
    Array.isArray(offers)
      ? offers.some(o => o.price ?? o.priceCurrency)
      : offers.price ?? offers.priceCurrency
  );
}

// TODO: handle recursive objects?
function flattenValues(data) {
  return Object.keys(data)
    .filter(x => x !== "undefined")
    .reduce((acc, key) => {
      const val = data[key];
      if (Array.isArray(val) && val.length === 1) {
        acc[key] = val[0];
      } else {
        acc[key] = val;
      }
      return acc;
    }, {});
}

function dataToSchemaOrg(data) {
  if (Object.keys(data).some(k => k.endsWith("priceCurrency"))) {
    const { name, description } = data;
    const aggregateRating = data["ratingValue"]
      ? {
          aggregateRating: {
            "@context": "https://schema.org/",
            "@type": "AggregateRating",
            bestRating: data.bestRating,
            worstRating: data.worstRating,
            ratingValue: data.ratingValue,
            ratingCount: data.ratingCount
          }
        }
      : null;
    return {
      Product: [
        {
          "@context": "https://schema.org/",
          "@type": "Product",
          name: name && !Array.isArray(name) ? name : data["og:title"],
          category: data.category,
          url: data["og:url"],
          image: data.image,
          description:
            description && !Array.isArray(description)
              ? description
              : data["og:description"],
          productID: data.productID,
          identifier: data.identifier,
          sku: data.sku,
          offers: {
            "@context": "https://schema.org/",
            "@type": "Offer",
            price: data["product:price:amount"] || data.price,
            priceCurrency: data["product:price:currency"] || data.priceCurrency,
            warranty: data.warranty
          },
          ...aggregateRating
        }
      ],
      RawParsedMicrodata: data
    };
  }
  return data;
}

async function scrapePage(context, stats) {
  const { $, request } = context;
  log.info(request.url);

  const parsed = WAE.default().parse($.html());

  let product = undefined;
  if (!isEmpty(parsed.jsonld)) {
    stats.inc("jsonld");
    product = checkIfProduct(parsed.jsonld) ? parsed.jsonld : null;
    if (product) stats.inc("jsonld-product");
  }
  if (!isEmpty(parsed.microdata)) {
    stats.inc("microdata");
    if (!product) {
      stats.inc("microdata-product");
      const normalizedResult = dataToSchemaOrg(flattenValues(parsed.microdata));
      product = checkIfProduct(normalizedResult) ? normalizedResult : null;
    }
  }
  if (!isEmpty(parsed.metatags)) {
    if (!product) {
      stats.inc("metatags-product");
      const normalizedResult = dataToSchemaOrg(flattenValues(parsed.metatags));
      product = checkIfProduct(normalizedResult) ? normalizedResult : null;
    }
  }
  if (product === undefined) return;
  stats.inc("parsed");

  if (product) {
    stats.inc("products");
    return Apify.pushData(product);
  } else {
    log.info("Not a product");
  }
}

async function getSitemapUrl(domain) {
  let sitemapUrl = await getSitemapUrlFromRobotsTxt(domain);
  if (sitemapUrl && (await checkUrl(sitemapUrl))) return sitemapUrl;

  sitemapUrl = new URL("sitemap.xml", domain).href;
  if (await checkUrl(sitemapUrl)) return sitemapUrl;
}

function enqueuePageUrl(requestQueue, url) {
  requestQueue.addRequest({ url, userData: { label: "PAGE" } });
}

function fixCorruptedUrl(url) {
  return url.replaceAll("&quot;", ""); // fix for zoot.cz
}

async function scrapeSitemap(context, requestQueue) {
  const { $ } = context;

  $("sitemapindex > sitemap > loc").each((idx, el) => {
    const url = fixCorruptedUrl($(el).html());
    requestQueue.addRequest({ url, userData: { label: "SITEMAP" } });
  });

  const urls = [];
  $("urlset > url").each((idx, el) => {
    const url = fixCorruptedUrl($(el).find("loc").html());
    urls.push(url);

    $(el)
      .find("xhtml\\:link[href][rel=alternate]")
      .each((idx, el) => {
        const url = el.attribs.href;
        urls.push(url);
      });
  });

  shuffle(urls).forEach(url => {
    enqueuePageUrl(requestQueue, url);
  });
}

// TODO: useProxy
Apify.main(async () => {
  const rollbar = Rollbar.init();
  const { domain } = await Apify.getInput();
  const actions = [];
  const stats = await withPersistedStats(x => x, {
    ok: 0,
    failed: 0,
    products: 0,
    parsed: 0,
    "metatags-product": 0,
    microdata: 0,
    "microdata-product": 0,
    jsonld: 0,
    "jsonld-product": 0
  });
  try {
    const sitemapUrl = await getSitemapUrl(domain);
    if (!sitemapUrl) {
      throw new Error(`Sitemap for ${domain} was not found.`);
    }
    const requestQueue = await Apify.openRequestQueue();
    const requestList = await Apify.openRequestList("sitemap-urls", [
      { url: sitemapUrl, userData: { label: "SITEMAP" } }
    ]);

    const crawler = new Apify.CheerioCrawler({
      requestList,
      requestQueue,
      async handlePageFunction(context) {
        const { request } = context;

        switch (request.userData?.label) {
          case "SITEMAP":
            await scrapeSitemap(context, requestQueue);
            break;
          case "PAGE":
            await scrapePage(context, stats);
            break;
        }
        stats.inc("ok");
      },
      async handleFailedRequestFunction() {
        stats.inc("failed");
      },
      postNavigationHooks: [
        res => {
          const { response, crawler } = res;
          if (response.statusMessage !== "OK") {
            stats.inc("failed");
            log.error("PostNavigationHook error status:", response.statusCode);
            if (response.statusCode === 429 && stats.get().failed >= 10) {
              log.error("Too many errors, aborting...");
              crawler.autoscaledPool.abort();
            }
          }
        }
      ],
      minConcurrency: 2
    });

    await crawler.run();
    await stats.save(true);
    await Promise.all(actions);
  } catch (e) {
    rollbar.error(e);
    throw e;
  }
});
