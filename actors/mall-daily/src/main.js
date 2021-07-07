const { S3Client } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "eu-central-1" });
const { uploadToKeboola } = require("@hlidac-shopu/actors-common/keboola.js");
const { CloudFrontClient } = require("@aws-sdk/client-cloudfront");
const {
  invalidateCDN,
  toProduct,
  uploadToS3,
  s3FileName
} = require("@hlidac-shopu/actors-common/product.js");
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");

const Apify = require("apify");
const cheerio = require("cheerio");
const extractItems = require("./detailParser");
const paginationParser = require("./paginationParser");

const {
  utils: { log, requestAsBrowser }
} = Apify;

const webCz = "https://www.mall.cz";
const webSk = "https://www.mall.sk";

Apify.main(async () => {
  // Get queue and enqueue first url.
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const { country, type, test = false } = await Apify.getValue("INPUT");
  const requestQueue = await Apify.openRequestQueue();
  let web;

  if (country === "CZ") {
    web = webCz;
    if (type === "CZECHITAS") {
      await requestQueue.addRequest({
        url: "https://www.mall.cz/parfemy-kosmetika",
        userData: {
          label: "CZECHITAS-START"
        }
      });
    } else {
      await requestQueue.addRequest({
        url: "https://www.mall.cz/mapa-stranek",
        userData: {
          label: "MAP"
        }
      });
      await requestQueue.addRequest({
        url: "https://www.mall.cz/znacky",
        userData: {
          label: "BRAND"
        }
      });
    }
  } else if (country === "SK") {
    web = webSk;
    await requestQueue.addRequest({
      url: "https://www.mall.sk/mapa-stranok",
      userData: {
        label: "MAP"
      }
    });
    await requestQueue.addRequest({
      url: "https://www.mall.sk/znacky",
      userData: {
        label: "BRAND"
      }
    });
  }
  const proxyGroups = ["CZECH_LUMINATI"];
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups
  });
  /* // to test one page
  await requestQueue.addRequest({
      url: 'https://www.mall.cz/damske-znackove-mikiny',
      userData: {
          label: 'PAGE',
      },
  }); */
  // Create crawler.
  const crawler = new Apify.BasicCrawler({
    requestQueue,
    // proxyConfiguration,
    // useApifyProxy: true,
    maxConcurrency: 20,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 100,
      persistStateKeyValueStoreId: "mall-sessions",
      sessionOptions: {
        maxUsageCount: 50
      }
    },
    handleRequestFunction: async ({ request, session }) => {
      const start = Date.now();

      const requestOptions = {
        url: request.url,
        ignoreSslErrors: true,
        proxyUrl: proxyConfiguration.newUrl(session.id),
        throwHttpErrors: false,
        headers: {
          // If you want to use the cookieJar.
          // This way you get the Cookie headers string from session.
          Cookie: session.getCookieString()
        }
      };

      const response = await requestAsBrowser(requestOptions);
      log.info(
        `${request.url}, ${request.userData.label} took: ${
          (Date.now() - start) / 1000
        }s`
      );
      // Status code check
      if (![200, 404].includes(response.statusCode)) {
        if (
          !request.url.includes(web) ||
          request.url.includes("mall.skhttps") ||
          request.url.includes("mall.czhttps")
        ) {
          log.info(`Bad URL loaded: ${request.url}`);
          return;
        }
        session.retire();
        request.retryCount--;
        throw new Error(`We got blocked by target on ${request.url}`);
      }

      if (request.userData.label === "REVIEW") {
        const { result, offset } = request.userData;
        const responseData = JSON.parse(response.body);
        result.reviewStats = responseData.stats;
        if (!result.reviews) {
          result.reviews = responseData.reviews;
        } else {
          result.reviews = result.reviews.concat(responseData.reviews);
        }

        if (responseData.stats.messages_count > offset) {
          const url = `https://www.mall.cz/api/product-reviews/find?productId=${
            result.productId
          }&offset=${offset + 15}`;
          await requestQueue.addRequest(
            {
              url,
              userData: {
                label: "REVIEW",
                result,
                offset: offset + 15
              }
            },
            {
              forefront: true
            }
          );
        } else {
          console.log(result.reviews);
          await Apify.pushData(result);
        }
      }

      let $;
      if (request.userData.label !== "REVIEW") {
        $ = cheerio.load(response.body);
        if ($(".cbm-error--404").length !== 0) {
          log.info(`404 ${request.url}`);
          return;
        }

        if (request.userData.label === "CZECHITAS-START") {
          const pageUrls = [];
          $("a.card, a.card-link").each(function () {
            const url = $(this).attr("href");
            pageUrls.push({
              url: !url.includes("http") ? `https://www.mall.cz${url}` : url,
              userData: {
                label: "PAGE"
              }
            });
          });
          for (const item of pageUrls) {
            await requestQueue.addRequest(item);
          }
        }

        if (request.userData.label === "MAP") {
          let menuItems = [];
          const mapSelector =
            country === "CZ"
              ? $('h1:contains("Mapa stránek")')
              : $('h1:contains("Mapa stránok")');
          mapSelector
            .closest("div")
            .find("a")
            .each(function () {
              const menuItemHref = $(this).attr("href");
              if (menuItemHref !== undefined) {
                menuItems.push(web + menuItemHref);
              }
            });
          console.log(
            `Found ${menuItems.length} valid urls, going to enqueue them.`
          );

          if (test) {
            menuItems = menuItems.slice(0, 10);
            log.info(
              `TEST is ${test}. Reduced menu items size to ${menuItems.length}.`
            );
          }
          for (const keyword of menuItems) {
            await requestQueue.addRequest({
              url: keyword,
              userData: {
                label: "PAGE"
              }
            });
          }
        } else if (request.userData.label === "BRAND") {
          // for debug
          // await Apify.setValue('html', $('body').html(), { contentType: 'text/html' });

          let brandUrls = [];
          $("ul li a").each(function () {
            const urlRaw = $(this).attr("href");
            if (urlRaw.includes("http") && urlRaw.includes("mall.")) {
              brandUrls.push(urlRaw);
            } else {
              brandUrls.push(web + urlRaw);
            }
            // brandUrls.push(web + $(this).attr('href'));
          });

          if (test) {
            brandUrls = brandUrls.slice(0, 10);
            log.info(
              `TEST is ${test}. Reduced menu brandUrls size to ${brandUrls.length}.`
            );
          }

          for (const url of brandUrls) {
            await requestQueue.addRequest({
              url,
              userData: {
                label: "PAGE"
              }
            });
          }
        } else if (request.userData.label === "PAGE") {
          // left menu add sub categories, just do it once and dont do it on pagination
          try {
            let itemsMenu = [];
            if ($("ul.nav-secondary li>a").length !== 0) {
              $(
                ".sdb-panel ul.nav-secondary--secondary li>a:not([class])"
              ).each(function () {
                const urlRaw = $(this).attr("href");
                if (urlRaw.includes("http") && urlRaw.includes("mall.")) {
                  itemsMenu.push(urlRaw);
                } else {
                  itemsMenu.push(web + urlRaw);
                }
              });
            }
            if (itemsMenu.length !== 0) {
              console.log(
                `Found ${itemsMenu.length} submenu urls, going to enqueue them, for ${request.url}`
              );

              if (test) {
                itemsMenu = itemsMenu.slice(0, 10);
                log.info(
                  `TEST is ${test}. Reduced itemsMenu size to ${itemsMenu.length}.`
                );
              }
              for (const urls of itemsMenu) {
                await requestQueue.addRequest({
                  url: urls,
                  userData: {
                    label: "PAGE"
                  }
                });
              }
            }
          } catch (e) {
            console.log(e);
          }

          // extract items from page
          try {
            const items = await extractItems($, web, country);
            if (items.length !== 0) {
              console.log(`Found ${items.length} storing them, ${request.url}`);
              // This is for Katka czechitas team, should be one time, we can remove it later
              if (type === "CZECHITAS") {
                for (const item of items) {
                  const url = `https://www.mall.cz/api/product-reviews/find?productId=${item.productId}`;
                  await requestQueue.addRequest(
                    {
                      url,
                      userData: {
                        label: "REVIEW",
                        result: item,
                        offset: 15
                      }
                    },
                    {
                      forefront: true
                    }
                  );
                }
              } else {
                for (const product of items) {
                  await uploadToS3(
                    s3,
                    `mall.${country.toLowerCase()}`,
                    await s3FileName(product),
                    "jsonld",
                    toProduct(
                      {
                        ...product,
                        inStock: true
                      },
                      { priceCurrency: country === "CZ" ? "CZK" : "EUR" }
                    )
                  );
                }
                await Apify.pushData(items);
              }
            }
          } catch (e) {
            // no items on the page check it out
            console.log(e.message);
            throw new Error(
              `Check this url, there are no items ${request.url}`
            );
          }

          if (type !== "FIRSTPAGE") {
            // if it is a first pagination, we need to get total number of results and enqueue them and add a subcategories
            if (request.url.indexOf("page=") === -1) {
              await paginationParser(
                $,
                requestQueue,
                request,
                web,
                proxyConfiguration.newUrl(session.id)
              );
            }
          }
        }
      }
    },

    // If request failed 4 times then this function is executed.
    handleFailedRequestFunction: async ({ request }) => {
      console.log(`Request ${request.url} failed 4 times`);
    }
  });
  // Run crawler.
  await crawler.run();
  console.log("Crawling finished.");
  if (type !== "CZECHITAS") {
    const env = await Apify.getEnv();
    await invalidateCDN(
      cloudfront,
      "EQYSHWUECAQC9",
      `mall.${country.toLowerCase()}`
    );
    log.info("invalidated Data CDN");
    if (!test) {
      let tableName = country === "CZ" ? "mall" : "mall_sk";
      if (type === "BF") {
        tableName = `${tableName}_bf`;
      }

      await uploadToKeboola(tableName);
      log.info("upload to Keboola finished");
    }
  }

  console.log("Finished.");
});
