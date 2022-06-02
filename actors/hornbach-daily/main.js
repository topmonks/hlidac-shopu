/**
 * Scrape categories and products from Hronbach HORNBACH
 */

import { fetch } from "@adobe/helix-fetch";
import Apify from "apify";
import { parseHTML } from "linkedom";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

const LABELS = {
  TOP_CATEGORIES: "TOP_CATEGORIES",
  SUB_CATEGORIES: "SUB_CATEGORIES",
  CATEGORY_PRODUCTS: "CATEGORY_PRODUCTS"
};

const { BasicCrawler, getInput, main, openRequestQueue, pushData } = Apify;

main(async () => {
  const { type = ActorType.FULL, country } = (await getInput()) ?? {};
  const urlBase = `https://www.hornbach.${country.toLowerCase()}/c/`;

  const requestQueue = await openRequestQueue();

  await requestQueue.addRequest(urlBase, {
    userData: {
      label: LABELS.TOP_CATEGORIES
    }
  });

  const crawler = new BasicCrawler({
    requestQueue,
    async handleRequestFunction({ request }) {
      const { url } = request;
      const resp = await fetch(url);
      const body = await resp.text();
      const { document } = parseHTML(body);

      await pushData({
        noop: 1
      });
    }
  });

  await crawler.run();
});
