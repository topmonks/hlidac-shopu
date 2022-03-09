import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import Apify from "apify";
import { LABELS, API_URL, PRICE_HEADER } from "./const.js";
import { siteMapToLinks, getCategoryId, getCategories } from "./tools.js";

const { log, requestAsBrowser } = Apify.utils;

async function scrapeSitemapLinks({ body, crawler }, { userInput }) {
  const { country } = userInput;
  log.info("START with main page");
  const links = siteMapToLinks(body);
  for (const link of links) {
    const id = getCategoryId(link);
    await crawler.requestQueue.addRequest(
      {
        url: API_URL(country, id),
        userData: {
          label: LABELS.CATEGORY,
          categoryId: id,
          link
        }
      },
      { forefront: true }
    );
  }
}

async function scrapeCategory({ request, json, crawler }, { userInput, s3 }) {
  const { country } = userInput;
  const { pageNumber, pageCount, articles } = json;
  if (pageNumber === 1) {
    const {
      userData: { categoryId }
    } = request;
    for (let i = 2; i <= pageCount; i++) {
      await crawler.requestQueue.addRequest({
        url: API_URL(country, categoryId, i),
        userData: {
          label: LABELS.CATEGORY,
          categoryId,
          page: i
        }
      });
    }
  }
  if (articles.length > 0) {
    const requests = [];
    const codes = articles.map(a => a.articleCode);
    const { body } = await requestAsBrowser({
      url: `https://www.hornbach.${country}/mvc/article/displaystates-and-prices.json`,
      method: "POST",
      json: true,
      useHttp2: true,
      headers: PRICE_HEADER,
      payload: JSON.stringify(codes)
    });
    for (const article of articles) {
      let currentPrice = article.allPrices.displayPrice.price.replace(",", ".");
      const result = {
        itemId: article.articleCode,
        itemUrl: `https://www.hornbach.${country}${article.localizedExternalArticleLink}`,
        itemName: article.title,
        currency: article.allPrices.displayPrice.currency,
        img: article.imageUrl,
        currentPrice: parseFloat(currentPrice),
        originalPrice: null,
        discounted: false,
        category: getCategories(article.categoryPath)
      };
      const price = body.filter(p => p.articleCode === article.articleCode);
      if (price) {
        const { allPrices } = price[0];
        let { displayPrice, guidingPrice } = allPrices;
        if (guidingPrice) {
          displayPrice = displayPrice.price.replace(",", ".");
          guidingPrice = guidingPrice.price.replace(",", ".");
          result.currentPrice = parseFloat(displayPrice);
          result.discounted = true;
          result.originalPrice = parseFloat(guidingPrice);
        }
      }
      requests.push(
        Apify.pushData(result),
        uploadToS3v2(s3, result, {
          priceCurrency: result.currency,
          inStock: true
        })
      );
    }
    await Promise.all(requests);
  }
}

Apify.main(async () => {
  rollbar.init();
  const userInput = await Apify.getInput();
  const { country = "cz" } = userInput;
  const requestQueue = await Apify.openRequestQueue();
  if (country === "cz") {
    await requestQueue.addRequest({
      url: "https://www.hornbach.cz/SitemapShop_category_cs_1.xml",
      userData: {
        label: LABELS.SITE
      }
    });
  } else {
    await requestQueue.addRequest({
      url: "https://www.hornbach.sk/SitemapShop_category_sk_1.xml",
      userData: {
        label: LABELS.SITE
      }
    });
  }

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: ["CZECH_LUMINATI"]
  });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    proxyConfiguration,
    maxConcurrency: 20,
    useSessionPool: true,
    handlePageFunction: async context => {
      const { request } = context;
      const {
        userData: { label }
      } = request;

      switch (label) {
        case LABELS.CATEGORY:
          return scrapeCategory(context, { s3, userInput });
        case LABELS.SITE:
          return scrapeSitemapLinks(context, { userInput });
      }
    },
    // If request failed 4 times then this function is executed
    handleFailedRequestFunction: async ({ request }) => {
      log.info(`Request ${request.url} failed 4 times`);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await invalidateCDN(cloudfront, "EQYSHWUECAQC9", `hornbach.${country}`);
  log.info("invalidated Data CDN");

  await uploadToKeboola(`hornbach_${country}`);
  log.info("Finished.");
});
