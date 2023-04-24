import { Actor, Dataset, log } from "apify";
import { HttpCrawler } from "@crawlee/http";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { itemSlug, shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";

const baseUrl = "https://www.kosik.cz/";

const slug = url => url.substring(1);
const slugBF = url => new URL(url).pathname.substring(1);
const listingUrl = ({ url }, fn = slug) =>
  new URL(
    `/api/web/page/products?${new URLSearchParams({
      slug: fn(url),
      limit: 60
    })}`,
    baseUrl
  ).href;
const listingBFUrl = url => listingUrl({ url }, slugBF);

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

  const {
    development,
    proxyGroups,
    type = ActorType.Full,
    bfUrls = ["https://www.kosik.cz/listy/bf-nanecisto-2021"]
  } = await getInput();

  const stats = await withPersistedStats(x => x, {
    pages: 0,
    items: 0,
    failed: 0
  });

  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

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
          {
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
          step: "DETAIL"
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
  log.info("crawler finished");

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

await Actor.main(main);
