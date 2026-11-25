import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { itemSlug, shopName, shopOrigin } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, Dataset, log } from "apify";

const baseUrl = "https://www.kosik.cz/";

// The API returns floats like 16.983000000000004 for a price shown as 16,98 Kč
const round = x => (typeof x === "number" ? Math.round(x * 100) / 100 : null);

export function parseItem(item, breadcrumbs) {
  const itemUrl = new URL(item.url, baseUrl).href;
  const currentPrice = round(item.price);
  const recommendedPrice = round(item.recommendedPrice);
  const originalPrice = currentPrice === recommendedPrice ? null : recommendedPrice;
  const pricePerUnit = item.pricePerUnit?.price;
  return {
    itemId: item.id,
    itemUrl,
    itemName: item.name,
    discounted: item.percentageDiscount > 0,
    discountedName: item.percentageDiscount > 0 ? `${item.percentageDiscount} %` : null,
    currentPrice,
    originalPrice,
    inStock: !item.firstOrderDay,
    category: breadcrumbs,
    img: item.image,
    shop: shopName(itemUrl),
    slug: itemSlug(itemUrl),
    shopOrigin: shopOrigin(itemUrl),
    currentUnitPrice: pricePerUnit ?? null,
    originalUnitPrice:
      originalPrice && pricePerUnit && item.price ? round((item.recommendedPrice * pricePerUnit) / item.price) : null,
    useUnitPrice: item.productQuantity?.prefix === "cca",
    quantity: item.productQuantity?.value
  };
}

const slug = url => url.substring(1);
const slugBF = url => new URL(url).pathname.substring(1);
const listingUrl = ({ url }, fn = slug) =>
  new URL(
    `/api/front/page/products?${new URLSearchParams({
      slug: fn(url),
      limit: 30
    })}`,
    baseUrl
  ).href;
const listingBFUrl = url => listingUrl({ url }, slugBF);

// The site loads the next pages of a listing by POSTing the cursor of the previous page
const moreRequest = (cursor, breadcrumbs) => ({
  url: new URL("/api/front/products/more", baseUrl).href,
  method: "POST",
  payload: JSON.stringify({ cursor, limit: 30 }),
  headers: { "Content-Type": "application/json" },
  uniqueKey: cursor,
  userData: { step: "MORE", breadcrumbs }
});

function* categoriesTree(root) {
  for (const category of root) {
    const subcategories = category.subcategories ?? category.subCategories;
    if (subcategories) {
      yield* categoriesTree(subcategories);
    }
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

export async function main() {
  rollbar.init();

  const {
    development,
    proxyGroups,
    type = ActorType.Full,
    bfUrls = ["https://www.kosik.cz/akce/black-friday"]
  } = await getInput();

  const stats = await withPersistedStats({
    pages: 0,
    items: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  const bfItemIds = new Set();
  const crawler = new HttpCrawler({
    proxyConfiguration,
    maxRequestsPerMinute: 400,
    additionalMimeTypes: ["application/json", "text/plain"],
    async requestHandler({ crawler, request, json }) {
      const { step } = request.userData;
      log.info(`Processing ${request.url}...`);
      switch (step) {
        case "CATEGORIES":
          {
            const requests = categoriesRequests(json);
            stats.add("pages", requests.length);
            log.info(`Adding ${requests.length} category requests`);
            await crawler.requestQueue.addRequests(requests, {
              forefront: true
            });
          }
          break;
        case "DETAIL":
        case "MORE":
          {
            const breadcrumbs =
              step === "MORE"
                ? request.userData.breadcrumbs
                : (json.breadcrumbs?.map(x => x.name)?.join(" > ") ?? json.title);
            const items = (step === "MORE" ? json.products : json.products?.items) || [];
            const cursor = step === "MORE" ? json.cursor : json.products?.cursor;
            if (cursor && items.length) {
              stats.inc("pages");
              await crawler.requestQueue.addRequest(moreRequest(cursor, breadcrumbs));
            }

            // A Black Friday list ends after about 550 products, its subcategories have the rest
            if (request.userData.bfRoot) {
              await crawler.requestQueue.addRequests(
                (json.subCategories ?? []).map(c => ({
                  url: listingBFUrl(new URL(c.url, baseUrl).href),
                  userData: { step: "DETAIL" }
                }))
              );
            }

            stats.add("items", items.length);
            for (const item of items) {
              if (type === ActorType.BlackFriday) {
                if (bfItemIds.has(item.id)) continue;
                bfItemIds.add(item.id);
              }
              const detail = parseItem(item, breadcrumbs);
              await Dataset.pushData(detail);
            }
          }
          break;
      }
    },
    failedRequestHandler({ request }, error) {
      log.error(`Request ${request.url} failed multiple times`, error);
      stats.inc("failed");
    }
  });

  const startingRequests = [];
  if (type === ActorType.BlackFriday) {
    for (const url of bfUrls) {
      startingRequests.push({
        url: listingBFUrl(url),
        userData: {
          step: "DETAIL",
          bfRoot: true
        }
      });
    }
  } else {
    startingRequests.push({
      url: "https://www.kosik.cz/api/front/menu/main",
      userData: {
        step: "CATEGORIES"
      }
    });
  }
  await crawler.run(startingRequests);

  if (!development) {
    try {
      const suffix = type === ActorType.BlackFriday ? "_bf" : "";
      const tableName = `kosik${suffix}`;
      await uploadToKeboola(tableName);
      log.info("upload to Keboola finished");
    } catch (err) {
      log.warning("upload to Keboola failed");
      log.error(err);
    }
  }
}
