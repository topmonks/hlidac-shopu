import { shops, shopsEntriesArray } from "./shops.mjs";

const apiHost = `https://api2.hlidacshopu.cz`;
const requestTimeout = 2400;

/**
 * Creates signal that will abort after `ms` milliseconds
 * @param {number} ms
 * @return {AbortSignal}
 */
const signalTimeout = ms => {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
};

/**
 * Resolves promise after `ms` milliseconds
 * @param {number} ms
 * @return {Promise.<string>}
 */
const timeout = ms =>
  new Promise((resolve, reject) => setTimeout(() => resolve("timeout"), ms));

/**
 * Retries given promise `n` times
 * @param {number} n
 * @param {function(): Promise.<Response>} promiseFactory
 * @return {Promise.<Response | string>}
 */
const retry = async (n, promiseFactory) => {
  for (let i = 0; i < n; i++) {
    try {
      return await promiseFactory();
    } catch (o_0) {
      await timeout(requestTimeout + requestTimeout * i);
    }
  }
};

/**
 * @param {string} detailUri
 * @return {string}
 */
const apiUrl = detailUri => {
  const searchParams = new URLSearchParams({ url: detailUri, pwa: "1" });
  return new URL(`/detail?${searchParams}`, apiHost).toString();
};

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
  avgHsSale
}) => ({
  key: shop,
  allProducts: count_clean,
  bfProducts: count_bf,
  avgClaimedDiscount: avgDeclaredSale,
  avgRealDiscount: avgHsSale
});

export async function fetchShopsStats() {
  const resp = await retry(3, () =>
    fetch(`${apiHost}/shop-numbers`, {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const shopsData = await resp.json();
  return shopsData
    .map(shopStats)
    .map(x => Object.assign({}, x, shops.get(x.key)));
}

export async function fetchDownloadStats() {
  const resp = await retry(3, () =>
    fetch(`${apiHost}/reviews-stats`, {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const {
    stats: { google, firefox }
  } = await resp.json();
  return {
    downloads: parseInt(google.downloads) + parseInt(firefox.downloads)
  };
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
  const query = new URLSearchParams({
    year: year ?? new Date().getFullYear().toString()
  });
  const resp = await retry(3, () =>
    fetch(`${apiHost}/shop-numbers?${query}`, {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const shopsData = await resp.json();
  const shopsStatsData = new Map(shopsData.map(shopStats).map(x => [x.key, x]));
  return shopsEntriesArray().map(([key, x]) =>
    Object.assign({ shop: key }, x, shopsStatsData.get(key))
  );
}

export async function fetchDiscountDataPercent() {
  const resp = await retry(3, () =>
    fetch(`${apiHost}/topslevy?discount=rel`, {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  return resp.json();
}

export async function fetchDiscountDataCZK() {
  const resp = await retry(3, () =>
    fetch(`${apiHost}/topslevy?discount=abs`, {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  return resp.json();
}

const review = ({ avatar, date, name, text, rating, type, sourceUrl }) => ({
  imageUrl: avatar.replace("s40", "s70"),
  date: new Date(Date.parse(date)),
  sortKey: Date.parse(date),
  name,
  text,
  rating: parseInt(rating),
  source: type,
  sourceUrl
});

const withNameAndText = x => x.name !== "" && x.text !== "";
const newestFirst = (a, b) =>
  a.sortKey < b.sortKey ? 1 : a.sortKey === b.sortKey ? 0 : -1;

export async function fetchReviews() {
  const resp = await retry(3, () =>
    fetch(`${apiHost}/reviews-stats`, {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const { reviews } = await resp.json();
  return reviews.map(review).filter(withNameAndText).sort(newestFirst);
}
