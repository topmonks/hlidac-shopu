import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { parseHTML } from "linkedom/cached";

/** @enum {string} */
const Labels = {
  START: "START",
  HOME: "HOME",
  PAGE: "PAGE",
  DETAIL: "DETAIL",
  CATEGORY: "CATEGORY",
  PAGI_PAGE: "PAGI_PAGE"
};
const web = "https://www.benu.cz";

function findSUKL(document) {
  const rows = document.querySelectorAll(".info-table tr");
  for (const row of rows) {
    const key = row.querySelector("th").innerText;
    if (key.includes("SUKL")) {
      console.log("key", key); // TODO: remove!!!
      return row.querySelector("td").innerText;
    }
  }
  return null;
}

function extractProduct(document) {
  const script = document
    .querySelector("#snippet-productRichSnippet-richSnippet")
    .innerHTML.trim();
  const jsonData = JSON.parse(script);
  const itemId = jsonData.identifier;
  if (!itemId) return;
  const { offers } = jsonData;
  const currentPrice = offers.price;
  const originalPriceEl = document.querySelector(
    "#product-detail .buy-box__price-head del"
  );
  const originalPrice = originalPriceEl
    ? parseFloat(
        originalPriceEl.innerText.replace("Kč", "").replace(/\s/g, "").trim()
      )
    : null;
  return {
    itemId,
    itemName: jsonData.name,
    itemUrl: jsonData.url,
    img: jsonData.image,
    currentPrice,
    identifierSUKL: findSUKL(document),
    originalPrice: originalPrice ? originalPrice : null,
    url: jsonData.url,
    category: document
      .querySelectorAll("ol#breadcrumb > li > a")
      .map(a => a.innerText),
    discounted: originalPrice ? currentPrice < originalPrice : false
  };
}

function productListingRequests(document) {
  const productsOnPage = document
    .querySelectorAll("ul.products > li")
    .map(product => {
      const spc = product
        .querySelector("div.spc")
        .querySelector("a.detail")
        .getAttribute("href");
      // if (!spc) return;
      const url = `${web}${spc}`;
      return {
        url,
        userData: {
          label: Labels.DETAIL
        }
      };
    })
    .filter(Boolean);
  log.info(`Found ${productsOnPage.length} products`);
  return productsOnPage;
}

async function main() {
  rollbar.init();
  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const input = (await KeyValueStore.getInput()) ?? {};
  const {
    development = process.env.TEST,
    maxRequestRetries = 3,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full
  } = input;

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    pages: 0,
    items: 0,
    itemsDuplicity: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    maxRequestRetries,
    maxRequestsPerMinute: 400,
    proxyConfiguration,
    async requestHandler({ body, request, crawler }) {
      const { document } = parseHTML(body.toString());
      if (request.userData.label === Labels.START) {
        log.info("START scraping benu.cz");
        let categories = document.querySelectorAll(
          "div.submenu li:not(.title) > a"
        );
        if (type === ActorType.TEST) {
          log.info("type === TEST");
          categories = categories.slice(0, 1);
        }
        const allCategories = categories.map(category => {
          const link = category.getAttribute("href");
          let url = `${web}${link}`;
          if (link.includes("https")) {
            url = link;
          }
          return {
            url,
            userData: {
              label: Labels.PAGE,
              mainCategory: category.innerText.trim()
            }
          };
        });
        log.info(`Found ${allCategories.length} allCategories.`);
        stats.add("categories", allCategories.length);
        await crawler.requestQueue.addRequests(allCategories);
      } else if (request.userData.label === Labels.PAGE) {
        log.info(`START with page ${request.url}`);
        const maxPage =
          document
            .querySelectorAll("p.paging a:not(.next):not(.ico-arr-right)")
            .at(-1)
            ?.innerText?.trim() ?? 0;
        const requests = productListingRequests(document);
        await crawler.requestQueue.addRequests(requests);
        if (maxPage !== 0) {
          const paginationPage = [];
          for (let i = 2; i <= maxPage; i++) {
            paginationPage.push({
              url: `${request.url}?page=${i}`,
              userData: {
                label: Labels.PAGI_PAGE,
                mainCategory: request.userData.mainCategory,
                category: request.userData.category
              }
            });
          }
          log.info(`Found ${paginationPage.length} pages in category.`);
          stats.add("pages", paginationPage.length);
          await crawler.requestQueue.addRequests(paginationPage, {
            forefront: true
          });
        }
      } else if (request.userData.label === Labels.PAGI_PAGE) {
        log.info(`START with page ${request.url}`);
        const requests = productListingRequests(document);
        await crawler.requestQueue.addRequests(requests);
      } else if (request.userData.label === Labels.DETAIL) {
        log.info(`START with product ${request.url}`);
        const result = extractProduct(document);
        await uploadToS3v2(s3, result, { priceCurrency: "CZK", inStock: true });
        await Dataset.pushData(result);
        log.info(`END with product ${request.url}`);
      }
    },
    failedRequestHandler({ request, log }, error) {
      log.error(
        `Request ${request.url} failed ${request.retryCount} times`,
        error
      );
    }
  });

  const startingRequests = [];
  if (type === ActorType.BF) {
    startingRequests.push({
      url: "https://www.benu.cz/black-friday",
      userData: {
        label: Labels.PAGE
      }
    });
    stats.inc("categories");
  } else if (type === ActorType.TEST) {
    startingRequests.push({
      url: "https://www.benu.cz/alavis-maxima-triple-blend-extra-silny-700-g",
      userData: {
        label: Labels.DETAIL
      }
    });
  } else {
    startingRequests.push({
      url: web,
      userData: {
        label: Labels.START
      }
    });
  }

  await crawler.run(startingRequests);
  log.info("crawler finished");

  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });
  await Promise.all([
    stats.save(true),
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", "benu.cz"),
    uploadToKeboola(type === ActorType.BF ? "benu_cz_bf" : "benu_cz")
  ]);
}

await Actor.main(main);
