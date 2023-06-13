import { Actor } from "apify";
import { LinkeDOMCrawler, createLinkeDOMRouter } from "@crawlee/linkedom";
import { gotScraping } from "got-scraping";
import { DOMParser } from "linkedom/cached";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPriceText } from "@hlidac-shopu/lib/parse.mjs";

const LABEL = {
  INDEX: "INDEX",
  LISTING: "LISTING",
  DETAIL: "DETAIL"
};

const baseUrl = "https://www.smarty.cz";

async function crawl() {
  rollbar.init();
  const domParser = new DOMParser();
  const crawler = new LinkeDOMCrawler({
    requestHandler: createLinkeDOMRouter({
      [LABEL.INDEX]: async ({ window: { document }, crawler }) => {
        const urls = Array.from(document.querySelectorAll(`url loc`)).map((el) => el.innerText);
        // https://www.smarty.cz/Vyrobce/samsung - we wanna just these
        // https://www.smarty.cz/Vyrobce/samsung/mobilni-telefony - but not these deep urls
        const brandsUrls = urls.filter(url => url.split(`/`).length === 5);
        const { addedRequests } = await crawler.addRequests(brandsUrls.map(url => ({
          url: `${url}#us=1&s=n&pg=all`,
          label: LABEL.LISTING
        })));
      },
      [LABEL.LISTING]: async ({ window: { document }, request, log }) => {
        const producerId = document.querySelector(`#fId`).value;
        const producerAlias = document.querySelector(`#producerAlias`).value;
        const res = await gotScraping({
          url: `https://www.smarty.cz/Product/ProducerProductItems?${(new URLSearchParams({
            producerId,
            producerAlias,
            itemTypeId: ``,
            productFilter: `1`,
            paramJson: JSON.stringify({ us: `1`, s: `n`, pg: `all` }),
            sort: `n`,
            page: `all`
          }))}`
        });
        const doc = domParser.parseFromString(res.body, `text/html`);
        if (doc.querySelector(`.errorPage`)) {
          log.error(`errorPage`, { body: res.body });
          return;
        }
        const products = [];
        doc.querySelectorAll(`.item`).forEach((el) => {
          const productJson = JSON.parse(el.getAttribute(`data-gaItem`));
          const urlRel = el.getAttribute(`data-url`);
          const product = {
            itemId: el.querySelector(`.icon.compare`).getAttribute(`data-id`),
            itemUrl: `${baseUrl}${urlRel}`,
            itemName: productJson.name,
            currentPrice: productJson.fullPrice,
            originalPrice: el.querySelector(`.buy .price .d .o`) && cleanPriceText(el.querySelector(`.buy .price .d .o`)?.textContent),
            currency: `CZK`,
            img: el.querySelector(`picture img`)?.getAttribute(`src`),
            inStock: productJson.available.includes(`Skladem`)
          };
          products.push(product);
        });
        await Actor.pushData(products);
      }
    })
  });
  await crawler.run([{ url: `${baseUrl}/Feed/Sitemap/Producers`, label: LABEL.INDEX }]);
  // await crawler.run([{ url: `${baseUrl}/Vyrobce/samsung#us=1&s=n&pg=all`, label: LABEL.LISTING }]) // for testing
  await uploadToKeboola("smarty_cz");
}

await Actor.main(crawl);
