const Apify = require("apify");
const {
  utils: { log }
} = Apify;

const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const {
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");

const { parseItems } = require("./utils");

exports.handleStart = async ({ $, requestQueue }, stats, input) => {
  // Handle Start URLs
  let menuUrls = [];
  $("ul.navbar-nav li a").each(function () {
    const menuUrl = $(this).attr("href");
    if (menuUrl && menuUrl.match("https://")) {
      menuUrls.push(menuUrl);
    }
  });
  if (input && input.development) {
    menuUrls = menuUrls.slice(0, 1);
    log.info("Development mode, find products only in 1 category");
  }
  for (const item of menuUrls) {
    await requestQueue.addRequest({
      url: item,
      userData: {
        label: "LIST"
      }
    });
    stats.urls += 1;
  }
};

exports.handleList = async ({ request, $, requestQueue }, stats, input) => {
  // Handle pagination
  const itemCount = parseInt(
    $("p.mo-pagination-status strong").text().match(/\d+/)[0]
  );
  let pagesCount = Math.ceil(itemCount / 120);
  log.info(`Adding ${pagesCount} paginations for ${request.url}`);
  if (input && input.development) {
    pagesCount = Math.min(pagesCount, 10);
    log.info("Development mode, pagination is set to maximum 10 pages.");
  }
  for (let i = 1; i <= pagesCount; i++) {
    let url;
    if (request.url.includes("?")) {
      url = `${request.url}&p=${i}&view_price=s`;
    } else {
      url = `${request.url}?p=${i}&view_price=s`;
    }

    await requestQueue.addRequest(
      {
        url,
        userData: {
          label: "PAGE"
        }
      },
      {
        forefront: true
      }
    );
    stats.urls += 1;
    log.info(JSON.stringify(stats));
  }
};

exports.handlePage = async ({ $, request }, stats, processedIds) => {
  // Handle details
  const productList = parseItems($, request);
  let requestList = [];
  // we don't need to block pushes, we will await them all at the end
  for (const product of productList) {
    if (!processedIds.has(product.itemId)) {
      processedIds.add(product.itemId);
      const fileName = await s3FileName(product);
      requestList.push(
        Apify.pushData(product),
        // upload JSON+LD data to CDN
        uploadToS3(s3, "makro.cz", fileName, "jsonld", toProduct(product, {}))
      );
      stats.items += 1;
    } else {
      stats.itemsDuplicity += 1;
    }
  }
  await Promise.all(requestList);
};
