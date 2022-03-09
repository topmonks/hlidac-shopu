import { S3Client } from "@aws-sdk/client-s3";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import {
  invalidateCDN,
  uploadToS3v2
} from "@hlidac-shopu/actors-common/product.js";
import { gotScraping } from "got-scraping";
import { paginationParser } from "./paginationParser.js";
import { extractItems, extractBfItems } from "./detailParser.js";
import cheerio from "cheerio";
import Apify from "apify";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";

const s3 = new S3Client({ region: "eu-central-1" });
const {
  utils: { log }
} = Apify;

const webCz = "https://www.mall.cz";
const webSk = "https://www.mall.sk";

let stats = {};
const processedIds = new Set();

Apify.main(async () => {
  // Get queue and enqueue first url.
  rollbar.init();
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });
  const input = await Apify.getInput();
  const {
    development = false,
    test = false,
    sample = false,
    maxRequestRetries = 3,
    maxConcurrency = 10,
    country = "CZ",
    proxyGroups = ["CZECH_LUMINATI"],
    type = "FULL"
  } = input ?? {};

  stats = (await Apify.getValue("STATS")) || {
    categories: 0,
    pages: 0,
    items: 0,
    itemsSkipped: 0,
    itemsDuplicity: 0,
    failed: 0
  };

  const requestQueue = await Apify.openRequestQueue();
  let web = country === "CZ" ? webCz : webSk;
  if (sample) {
    // to test one page
    await requestQueue.addRequest({
      //url: "https://www.mall.cz/dozy-potraviny?pagination=2",
      url: "https://www.mall.sk/potraviny-a-napoje?pagination=2",
      userData: {
        label: "PAGE"
      }
    });
  } else if (type === "BF") {
    await requestQueue.addRequest({
      url: `https://www.mall.${country}/api/campaign/data?pathName=/kampan/black-friday&page=1&o=campaign,sort_2&menuSorting=sort_4&promotionPrice=true&labels[]=BFLV&sortingLabels[]=BF01`,
      userData: {
        label: "START"
      }
    });
  } else if (country === "CZ") {
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
      /*await requestQueue.addRequest({
        url: "https://www.mall.cz/znacky",
        userData: {
          label: "BRAND"
        }
      });*/
    }
  } else if (country === "SK") {
    await requestQueue.addRequest({
      url: "https://www.mall.sk/mapa-stranok",
      userData: {
        label: "MAP"
      }
    });
    /*await requestQueue.addRequest({
      url: "https://www.mall.sk/znacky",
      userData: {
        label: "BRAND"
      }
    });*/
  }

  const persistState = async () => {
    await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
    log.info(JSON.stringify(stats));
  };
  Apify.events.on("persistState", persistState);

  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  // Create crawler.
  const crawler = new Apify.BasicCrawler({
    requestQueue,
    //proxyConfiguration,
    maxRequestRetries,
    maxConcurrency,
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
        proxyUrl: proxyConfiguration.newUrl(session.id),
        throwHttpErrors: false,
        headers: {
          // If you want to use the cookieJar.
          // This way you get the Cookie headers string from session.
          Cookie: session.getCookieString()
        }
      };

      const response = await gotScraping(requestOptions);
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
      if (type === "BF") {
        const responseData = JSON.parse(response.body);
        if (request.userData.label === "START") {
          if (responseData.total > 60) {
            const max = Math.ceil(responseData.total / 60);
            for (let i = 2; i <= max; i++) {
              await requestQueue.addRequest({
                url: `https://www.mall.${country}/api/campaign/data?pathName=/kampan/black-friday&page=${i}&o=campaign,sort_2&menuSorting=sort_4&promotionPrice=true&labels[]=BFLV&sortingLabels[]=BF01`,
                userData: {
                  label: "PAGE"
                }
              });
            }
          }

          const storeItems = await extractBfItems(
            responseData.products,
            country
          );
          log.info(`Storing ${storeItems.length} items`);
          await Apify.pushData(storeItems);
        } else if (request.userData.label === "PAGE") {
          const storeItems = await extractBfItems(
            responseData.products,
            country
          );
          log.info(`Storing ${storeItems.length} items`);
          await Apify.pushData(storeItems);
        }
      } else if (request.userData.label !== "REVIEW") {
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
          // extract items from page
          try {
            const items = await extractItems($, web, country);
            if (items.length !== 0) {
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
                // we don't need to block pushes, we will await them all at the end
                const requests = [];
                for (const product of items) {
                  if (!processedIds.has(product.itemId)) {
                    processedIds.add(product.itemId);
                    requests.push(
                      Apify.pushData(product),
                      uploadToS3v2(
                        s3,
                        {
                          ...product,
                          inStock: true
                        },
                        { priceCurrency: country === "CZ" ? "CZK" : "EUR" }
                      )
                    );
                    stats.items++;
                  } else {
                    stats.itemsDuplicity++;
                  }
                }
                console.log(
                  `${request.url} Found ${requests.length / 2} unique products`
                );
                // await all requests, so we don't end before they end
                await Promise.allSettled(requests);
              }
            }
          } catch (e) {
            // no items on the page check it out
            console.log(e.message);
            /*throw new Error(
              `Check this url, there are no items ${request.url}`
            );*/
          }

          //Only from first pagination need obtain secondary menu links and pagination links and enqueue them.
          if (request.url.indexOf("pagination=") === -1) {
            // left menu add sub categories, just do it once and dont do it on pagination
            try {
              let itemsMenu = [];
              // Old secondary menu type
              if ($("ul.nav-secondary li>a").length !== 0) {
                $(
                  ".sdb-panel ul.nav-secondary--secondary li>a:not([class])"
                ).each(function () {
                  const urlRaw = $(this).attr("href");
                  if (urlRaw.includes("http") && urlRaw.includes("mall.")) {
                    itemsMenu.push(urlRaw);
                  } else {
                    itemsMenu.push(`${web}${urlRaw}`);
                  }
                });
              }
              // new secondary menu type
              const newSecondaryMenu = $(
                "ul.navigation-menu li.navigation-menu__item--child>a"
              );
              if (newSecondaryMenu.length !== 0) {
                newSecondaryMenu.each(function () {
                  const urlRaw = $(this).attr("href");
                  if (urlRaw.includes("http") && urlRaw.includes("mall.")) {
                    itemsMenu.push(urlRaw);
                  } else {
                    itemsMenu.push(`${web}${urlRaw}`);
                  }
                });
              }
              if (itemsMenu.length !== 0) {
                stats.categories += itemsMenu.length;
                console.log(
                  `${request.url} Found ${itemsMenu.length} submenu urls, going to enqueue them`
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

            await paginationParser(
              $,
              requestQueue,
              request,
              web,
              proxyConfiguration.newUrl(session.id),
              stats
            );
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

  await Apify.setValue("STATS", stats).then(() => log.debug("STATS saved!"));
  log.info(JSON.stringify(stats));

  if (type !== "CZECHITAS") {
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
