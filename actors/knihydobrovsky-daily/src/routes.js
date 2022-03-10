import Apify from "apify";
import { URL } from "url";
import { uploadToS3v2 } from "@hlidac-shopu/actors-common/product.js";

const {
  utils: { log }
} = Apify;

const canonicalUrl = x => new URL(x, "https://www.knihydobrovsky.cz");
const canonical = x => canonicalUrl(x).href;

export async function handleStart(request, $, requestQueue, stats) {
  const links = $("#main div.row-main li a")
    .not("div:contains('Magnesia Litera')")
    .map(function () {
      return $(this).attr("href");
    })
    .get()
    .filter(
      x =>
        !x.includes("magnesia-litera") &&
        !x.includes("velky-knizni-ctvrtek") &&
        !x.includes("knihomanie")
    );
  const absoluteLinks = links.map(x => canonical(x));
  stats.categories += absoluteLinks.length;
  console.log(`Found ${absoluteLinks.length} categories from start`);
  for (const link of absoluteLinks) {
    await requestQueue.addRequest({
      url: link,
      userData: { label: "SUBLIST" }
    });
  }
}

export async function handleSubList(request, $, requestQueue, stats) {
  // if there are more subcategories enque urls...
  let $bookGenres = $("#bookGenres");
  if ($bookGenres.text()) {
    const links = $bookGenres
      .next("nav")
      .find("a")
      .map(function () {
        return $(this).attr("href");
      })
      .get();
    stats.categories += links.length;
    console.log(`Found ${links.length} categories from sublist`);
    for (const link of links.map(x => canonical(x))) {
      await requestQueue.addRequest({
        url: link,
        userData: { label: "SUBLIST" }
      });
    }
  }
  //put this page also to queue as LIST page
  stats.pages++;
  console.log(`Adding pagination page ${request.url}?sort=2&currentPage=1`);
  await requestQueue.addRequest({
    url: `${request.url}?sort=2&currentPage=1`,
    uniqueKey: `${request.url}?sort=2&currentPage=1`,
    userData: { label: "LIST" }
  });
}

/**
 *
 * @param {Request} request
 * @param {Cheerio} $
 * @param {RequestQueue} requestQueue
 * @param {Set} handledIds
 * @param {S3Client} s3
 * @param {JSON} stats
 * @returns {Promise<void>}
 */
export async function handleList(
  request,
  $,
  requestQueue,
  handledIds,
  s3,
  stats
) {
  //console.log($.html());
  // Handle pagination
  let nextPageHref = $("nav.paging span:contains('Další')")
    .parent("a")
    .attr("href");
  if (nextPageHref) {
    const url = canonicalUrl(nextPageHref.trim());
    const pageNumber = url.searchParams.get("currentPage");
    url.searchParams.set("offsetPage", pageNumber);
    console.log(`Adding pagination page ${url.href}`);
    stats.pages++;
    await requestQueue.addRequest({
      url: url.href,
      userData: { label: "LIST" }
    });
  } else {
    log.info("category finish", { url: request.url });
  }

  const products = $("li[data-productinfo]")
    .map(function () {
      const $item = $(this);
      const dataLink = canonicalUrl($item.find("a.buy-now").attr("data-link"));
      const originalPrice =
        parseInt($item.find("p.price span.price-strike").text(), 10) || null;
      return {
        itemId:
          $item
            .find("h3 a")
            .attr("href")
            .match(/-(\d+)$/)?.[1] ??
          dataLink.searchParams.get("categoryBookList-itemPreview-productId"),
        itemUrl: canonical($item.find("h3 a").attr("href")),
        itemName: $item.find("span.name").text(),
        img: $item.find("picture img").attr("src"),
        currentPrice: parseInt($item.find("p.price strong").text(), 10) || 0,
        originalPrice,
        discounted: Boolean(originalPrice),
        rating: parseFloat(
          $item.find("span.stars.small span").attr("style").split("width: ")[1]
        ),
        currency: "CZK",
        inStock: $item.find("a.buy-now").text().includes("Do košíku"),
        category: "",
        breadCrumbs: ""
      };
    })
    .toArray()
    .filter(x => x.itemId);

  const requests = [];
  for (const product of products) {
    // Save data to dataset
    if (!handledIds.has(product.itemId)) {
      handledIds.add(product.itemId);
      requests.push(
        Apify.pushData(product),
        uploadToS3v2(s3, product, { category: "" })
      );
      stats.items++;
    } else {
      stats.itemsDuplicity++;
    }
  }
  console.log(`${request.url} Found ${requests.length / 2} unique products`);
  // await all requests, so we don't end before they end
  await Promise.allSettled(requests);
}
