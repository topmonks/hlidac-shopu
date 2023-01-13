import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { Actor, Dataset, KeyValueStore, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { itemSlug, shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";

const baseUrl = "https://www.kosik.cz/";

const slug = url => url.substring(1);
const listingUrl = ({ url }) =>
  `${baseUrl}api/web/page/products?slug=${slug(url)}&limit=60`;

const slugBF = url => new URL(url).pathname.substring(1);
const listingBFUrl = url =>
  `${baseUrl}api/web/page/products?slug=${slugBF(url)}&limit=60`;

function* categoriesTree(root) {
  for (const category of root) {
    if (category.subcategories) yield* categoriesTree(category.subcategories);
    yield listingUrl(category);
  }
}

/**
 * @param categories
 * @returns {{url: string, userData: {step: string}}[]}
 */
function categoriesRequests({ categories }) {
  const requests = [];
  for (const url of categoriesTree(categories)) {
    requests.push({
      url,
      userData: { step: "DETAIL" }
    });
  }
  return requests;
}

function parseItem(item, breadcrumbs) {
  const itemUrl = new URL(item.url, baseUrl).href;
  return {
    itemId: item.id,
    itemUrl,
    itemName: item.name,
    discounted: item.percentageDiscount > 0,
    discountedName:
      item.percentageDiscount > 0 ? `${item.percentageDiscount} %` : null,
    currentPrice: item.price,
    originalPrice:
      item.price == item.recommendedPrice ? null : item.recommendedPrice,
    inStock: !item.firstOrderDay,
    category: breadcrumbs,
    img: item.image,
    shop: shopName(itemUrl),
    slug: itemSlug(itemUrl),
    shopOrigin: shopOrigin(itemUrl),
    currentUnitPrice: item.pricePerUnit?.price ?? null,
    useUnitPrice: item.productQuantity?.prefix === "cca",
    quantity: item.productQuantity?.value
  };
}

async function main() {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1", maxAttempts: 3 });
  const cloudfront = new CloudFrontClient({
    region: "eu-central-1",
    maxAttempts: 3
  });

  const input = (await KeyValueStore.getInput()) ?? {};
  const {
    development = process.env.TEST,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.Full,
    bfUrls = ["https://www.kosik.cz/listy/bf-nanecisto-2021"]
  } = input;

  const stats = await withPersistedStats(
    x => x,
    (await KeyValueStore.getValue("STATS")) || {
      pages: 0,
      items: 0
    }
  );

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const crawler = new HttpCrawler({
    proxyConfiguration,
    // maxRequestsPerMinute: 400,
    additionalMimeTypes: ["application/json", "text/plain"],
    async requestHandler({ crawler, request, json }) {
      const { step } = request.userData;
      log.info(`Processing ${request.url}...`);
      if (step === "CATEGORIES") {
        const requests = categoriesRequests(json);
        stats.add("pages", requests.length);
        log.info(`Adding ${requests.length} category requests`);
        await crawler.requestQueue.addRequests(requests);
      } else if (step === "DETAIL") {
        if (json?.more) {
          stats.inc("pages");
          await crawler.requestQueue.addRequest({
            url: json.more,
            userData: { step: "DETAIL" }
          });
        }

        const breadcrumbs =
          json.breadcrumbs?.map(x => x.name)?.join(" > ") ?? json.title;
        const items = json.products?.items || [];
        stats.add("items", items.length);
        for (const item of items) {
          const detail = parseItem(item, breadcrumbs);
          await Promise.all([
            Dataset.pushData(detail),
            uploadToS3v2(s3, detail, { priceCurrency: "CZK" })
          ]);
        }
      }
    },
    failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
    }
  });

  const startingRequests = [];
  if (type === ActorType.BlackFriday) {
    for (const url of bfUrls) {
      startingRequests.push({
        url: listingBFUrl(url),
        userData: {
          step: "DETAIL"
        }
      });
    }
  } else {
    startingRequests.push({
      url: "https://www.kosik.cz/api/web/menu/main",
      userData: {
        step: "CATEGORIES"
      }
    });
  }
  await crawler.run(startingRequests);
  log.info("crawler finished");

  if (!development) {
    await invalidateCDN(cloudfront, "EQYSHWUECAQC9", "kosik.cz");
    log.info("invalidated Data CDN");

    try {
      let tableName = `kosik`;
      if (type === ActorType.BlackFriday) {
        tableName = `${tableName}_bf`;
      }
      await uploadToKeboola(tableName);
      log.info("upload to Keboola finished");
    } catch (err) {
      log.warning("upload to Keboola failed");
      log.error(err);
    }
  }
}

await Actor.main(main);
