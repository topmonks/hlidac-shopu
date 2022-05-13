import { shops, shopsEntriesArray } from "./shops.mjs";

const apiHost = "https://api.hlidacshopu.cz/v2/";
const appDataHost = "https://data.hlidacshopu.cz/app/";
const requestTimeout = 2400;

/**
 * Creates signal that will abort after `ms` milliseconds
 * @param {number} ms
 * @return {AbortSignal}
 */
export const signalTimeout = ms => {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
};

/**
 * Resolves promise after `ms` milliseconds
 * @param {number} ms
 * @return {Promise.<string>}
 */
export const timeout = ms =>
  new Promise((resolve, reject) => setTimeout(() => resolve("timeout"), ms));

/**
 * Retries given promise `n` times
 * @param {number} n
 * @param {function(): Promise} promiseFactory
 * @return {Promise}
 */
export const retry = async (n, promiseFactory) => {
  let lastError;
  for (let i = 0; i < n; i++) {
    try {
      return await promiseFactory();
    } catch (ex) {
      lastError = ex;
      await timeout(requestTimeout + requestTimeout * i);
    }
  }
  if (lastError) throw lastError;
};

/**
 *
 * @param {string} resource
 * @param {Object | string=} query
 * @returns {string}
 */
const apiEndpoint = (resource, query) => {
  const endpoint = query
    ? `${resource}?${new URLSearchParams(query)}`
    : resource;
  return new URL(endpoint, apiHost).href;
};

const appDataEndpoint = resource => new URL(resource, appDataHost).href;

/**
 * @param {string} detailUri
 * @return {string}
 */
const apiUrl = detailUri => apiEndpoint("detail", { url: detailUri, pwa: "1" });

export async function fetchDataSet(detailUri) {
  const resp = await retry(3, () =>
    fetch(apiUrl(detailUri), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  return resp.json();
}

const shopStats = ({
  shop,
  count_clean,
  count_bf,
  avgDeclaredSale,
  avgHsSale,
  ...rest
}) => ({
  key: shop,
  allProducts: count_clean,
  bfProducts: count_bf,
  avgClaimedDiscount: avgDeclaredSale,
  avgRealDiscount: avgHsSale,
  ...rest
});

export async function fetchShopsStats() {
  const resp = await retry(3, () =>
    fetch(apiEndpoint("shop-numbers"), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const shopsData = await resp.json();
  return shopsData
    .map(shopStats)
    .map(x => Object.assign({}, x, shops.get(x.key)));
}

export function templateData(
  detailUrl,
  {
    metadata: {
      shop,
      name,
      imageUrl,
      realDiscount,
      claimedDiscount,
      type,
      ...prices
    },
    data: { currentPrice, originalPrice }
  }
) {
  const lastDeclaredPrice = originalPrice
    .map(x => x.y)
    .filter(y => y)
    .pop();
  const { y: actualPrice, x: date } = currentPrice.filter(({ y }) => y).pop();
  return {
    detailUrl,
    name,
    shop,
    imageUrl,
    claimedDiscount,
    actualPrice,
    lastDeclaredPrice,
    discount: realDiscount,
    discountType: type,
    date: new Date(date),
    data: { currentPrice, originalPrice },
    ...prices
  };
}

export async function fetchDashboardData(year) {
  const resp = await retry(3, () =>
    fetch(apiEndpoint("shop-numbers", { year }), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const shopsData = await resp.json();
  const shopsStatsData = new Map(shopsData.map(shopStats).map(x => [x.key, x]));
  return shopsEntriesArray(([shop, x]) =>
    Object.assign({ shop }, x, shopsStatsData.get(shop))
  );
}

export async function fetchDashboardV2Data(extraData = new Map()) {
  const resp = await retry(3, () =>
    fetch(apiEndpoint("dashboard"), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const shopsData = await resp.json();
  const shopsStatsData = new Map(shopsData.map(shopStats).map(x => [x.key, x]));
  return shopsEntriesArray(([shop, x]) =>
    Object.assign({ shop }, x, shopsStatsData.get(shop), extraData.get(shop))
  ).filter(x => x.shop.match(/(\.cz)/));
}

export async function fetchDiscountDataPercent() {
  const resp = await retry(3, () =>
    fetch(apiEndpoint("topslevy", "discount=rel"), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  return resp.json();
}

export async function fetchDiscountDataCZK() {
  const resp = await retry(3, () =>
    fetch(apiEndpoint("topslevy", "discount=abs"), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  return resp.json();
}

const withText = x => x.reviewBody;
const newestFirst = (a, b) => b.datePublished.localeCompare(a.datePublished);

export async function fetchReviews() {
  const resp = await retry(3, () =>
    fetch(appDataEndpoint("reviews.jsonld"), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const reviews = await resp.json();
  return reviews.filter(withText).sort(newestFirst);
}

export async function fetchStats() {
  const resp = await retry(3, () =>
    fetch(appDataEndpoint("stats.jsonld"), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  return resp.json();
}
