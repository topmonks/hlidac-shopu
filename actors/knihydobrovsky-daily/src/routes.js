const {
  toProduct,
  uploadToS3
} = require("@hlidac-shopu/actors-common/product.js");
const Apify = require("apify");
const { URL } = require("url");

const {
  utils: { log }
} = Apify;

const canonicalUrl = x => new URL(x, "https://www.knihydobrovsky.cz");
const canonical = x => canonicalUrl(x).href;

exports.handleStart = async ({ request, $ }, requestQueue) => {
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
  for (const link of absoluteLinks) {
    await requestQueue.addRequest({
      url: link,
      userData: { label: "SUBLIST" }
    });
  }
};

exports.handleSubList = async ({ request, $ }, requestQueue) => {
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
    for (const link of links.map(x => canonical(x))) {
      await requestQueue.addRequest({
        url: link,
        userData: { label: "SUBLIST" }
      });
    }
  }
  //put this page also to queue as LIST page
  await requestQueue.addRequest({
    url: `${request.url}?sort=2&currentPage=1`,
    uniqueKey: `${request.url}?sort=2&currentPage=1`,
    userData: { label: "LIST" }
  });
};

function s3FileName(detail) {
  const url = new URL(detail.itemUrl);
  return url.pathname.match(/-(\d+)$/g)?.[0].substr(1);
}

/**
 *
 * @param {Request} request
 * @param {Cheerio} $
 * @param {RequestQueue} requestQueue
 * @param {Set} handledIds
 * @param {S3Client} s3
 * @returns {Promise<void>}
 */
async function handleList({ request, $ }, requestQueue, handledIds, s3) {
  // Handle pagination
  let nextPageHref = $("nav.paging span:contains('Další')")
    .parent("a")
    .attr("href");
  if (nextPageHref) {
    const url = canonicalUrl(nextPageHref.trim());
    const pageNumber = url.searchParams.get("currentPage");
    url.searchParams.set("offsetPage", pageNumber);

    await requestQueue.addRequest({
      url: url.href,
      userData: { label: "LIST" }
    });
  } else {
    log.info("category finish", { url: request.url });
  }

  const result = $("li[data-productinfo]")
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
            .match(/-(\d+)$/g)?.[1] ??
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
        inStock: $item.find("a.buy-now").text().includes("Do košíku")
      };
    })
    .toArray()
    .filter(x => x.itemId)
    .filter(x => !handledIds.has(x.itemId));

  await Apify.pushData(result);

  for (const detail of result) {
    await uploadToS3(
      s3,
      "knihydobrovsky.cz",
      s3FileName(detail),
      "jsonld",
      toProduct({ ...detail, category: "" }, {})
    );
  }
  for (const id of result.map(x => x.itemId)) {
    handledIds.add(id);
  }
}

exports.handleList = handleList;
