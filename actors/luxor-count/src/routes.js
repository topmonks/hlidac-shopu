const Apify = require("apify");
const { gotScraping } = require("got-scraping");

const { URL_SITEMAP } = require("./const");
const cheerio = require("cheerio");

const {
  utils: { log }
} = Apify;

exports.handleStart = async (context, crawlContext) => {
  console.log("---\nhandleStart");

  log.info("Downloading " + URL_SITEMAP);

  const requestOptions = {
    url: URL_SITEMAP,
    responseType: "text"
  };

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  $("sitemap").each((ix, el) => {
    const url = $(el).find("loc").html();
    if (url.indexOf("product") > -1) {
      const req = {
        url,
        userData: {
          label: "LIST"
        }
      };

      crawlContext.requestQueue.addRequest(req);
    } else {
      console.log("Skipper", url);
    }
  });
};

exports.handleList = async (context, stats, crawlContext) => {
  const { request } = context;

  const requestOptions = {
    url: request.url,
    responseType: "text"
  };

  // Page counted by pagination
  // 11125*24+913×24+1004×24+957×24+1627×24 = 375024

  const { body } = await gotScraping(requestOptions);

  const $ = cheerio.load(body, { xmlMode: true });

  const urls = $("url");
  let productId = [];
  $(urls).each((ix, el) => {
    const productName = $(el).find("loc").html();
    if (!productId.includes(productName)) {
      productId.push(productName);
      stats.items++;
    } else {
      //console.log("itemsDuplicity", productName);
      stats.itemsDuplicity++;
    }
  });

  console.log(`Items count in XML: ${stats.items}`);
};

exports.handleDetail = async (request, crawlContext) => {};
