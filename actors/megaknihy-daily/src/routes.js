const Apify = require("apify");
const cheerio = require("cheerio");
const {
  getAllSubcategories,
  getMaxPaginationNumber,
  getProductsData
} = require("./utils");

const {
  utils: { log }
} = Apify;

exports.handleStart = async ({ url, $, body }, requestQueue) => {
  const subcategories = getAllSubcategories($);

  for (const subcategory of subcategories) {
    await requestQueue.addRequest(
      {
        url: `${subcategory.url}?p=1`,
        userData: {
          label: "PAGE",
          categories: subcategory.name
        }
      },
      { forefront: true }
    );
  }
  log.info(`[START]: Found ${subcategories.length} categories --- ${url}`);

  if (subcategories.length === 0) {
    await Apify.setValue("HTML", body, { contentType: "text/html" });
    throw new Error(
      `Handling of starting url ${url} failed, look at the HTML in key-value store.`
    );
  }
};

exports.handlePage = async (
  { url, $, body },
  categories,
  requestQueue,
  page,
  alreadyScrapedProducts
) => {
  // The subcategories on the page does not contain all the products, that the list does
  // They are more of a specific selection
  // Because I am not going into details, just listings, there would be a lot
  // of dupes, if I would add the subcategories on the listing page to scrape
  // Only disadvantage of implemented approach are incomplete category names
  // e.g. MiniPEDIE - Objevujeme svět! Domácí mazlíčci has categories Pro děti, Pro nejmenší, where
  // we can find it on the website, but it can be also found in MiniPEDIE subcategory, which is not captured

  const pageNumber = url.match(/p=[0-9]+/)[0].match(/[0-9]+/)[0];
  const { productsData, outOfStockProductDiscovered } = getProductsData(
    $,
    categories,
    alreadyScrapedProducts
  );

  if (productsData.length === 0 && !outOfStockProductDiscovered) {
    await Apify.setValue("Products", body, { contentType: "text/html" });
    throw new Error("There is no product on the page, need request to retry");
  }

  await Apify.pushData(productsData);
  log.info(`[PAGE]: Scraped ${productsData.length} products --- ${url}`);

  if (outOfStockProductDiscovered) {
    // stop scraping the category
    log.info(
      `[PAGE_FINISH]: Found ${pageNumber} pages with products in stock for ${categories} --- ${url}`
    );
  } else {
    const maxPagination = Number(getMaxPaginationNumber($));
    if (maxPagination === 0) {
      // there is only one page
      log.info(
        `[PAGE_FINISH]: Found ${pageNumber} page with products in stock for ${categories} --- ${url}`
      );
    } else if (Number(pageNumber) < maxPagination) {
      await requestQueue.addRequest(
        {
          url: `${url.substr(0, url.length - (3 + pageNumber.length))}?p=${
            Number(pageNumber) + 1
          }`,
          userData: {
            label: "PAGE",
            categories
          }
        },
        { forefront: true }
      );
    } else {
      // stop the scraping
      log.info(
        `[PAGE_FINISH]: Found ${pageNumber} pages with products in stock for ${categories} --- ${url}`
      );
    }
  }
};
