import { shops } from "./shops.js";

const apiHost = `https://api2.hlidacshopu.cz`;
const requestTimeout = 2400;

const signalTimeout = ms => {
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
};

const timeout = ms =>
  new Promise((resolve, reject) => setTimeout(() => resolve("timeout"), ms));

const retry = async (n, promiseFactory) => {
  for (let i = 0; i < n; i++) {
    try {
      return await promiseFactory();
    } catch (o_0) {
      await timeout(requestTimeout + requestTimeout * i);
    }
  }
};

const apiUrl = detailUri => {
  const searchParams = new URLSearchParams({ url: detailUri, metadata: "1" });
  return new URL(`/shop?${searchParams}`, apiHost).toString();
};

const meta = ({ itemImage, itemName, real_sale, ...rest }) => ({
  name: itemName,
  imageUrl: itemImage === "null" ? null : itemImage,
  realDiscount: real_sale === "null" ? null : parseFloat(real_sale) / 100,
  ...rest
});

const parseDate = s => {
  const d = new Date(s);
  d.setHours(0, 0, 0, 0);
  return d;
};

function* daysBetween(start, end) {
  const startDay = parseDate(start);
  const endDay = parseDate(end);
  for (const d = startDay; d <= endDay; d.setDate(d.getDate() + 1)) {
    yield new Date(d.getTime());
  }
}

function createDataset(data) {
  if (typeof data === "string") {
    data = JSON.parse(data);
  }
  const dataMap = new Map(data.map(x => [parseDate(x.d).getTime(), x]));
  let lastDay = data[0];
  const days = Array.from(
    daysBetween(parseDate(data[0].d), parseDate(data[data.length - 1].d))
  );
  const originalPrice = new Array(days.length);
  const currentPrice = new Array(days.length);
  for (let i = 0, l = days.length; i < l; i++) {
    const day = days[i];
    const item = dataMap.get(day.getTime()) || lastDay;
    lastDay = item;
    originalPrice[i] = {
      x: day,
      y: item.o === "" ? null : parseFloat(item.o)
    };
    currentPrice[i] = {
      x: day,
      y: item.c === "" ? null : parseFloat(item.c)
    };
  }
  return {
    originalPrice,
    currentPrice
  };
}

async function fetchDataSet(detailUri) {
  const resp = await retry(3, () =>
    fetch(apiUrl(detailUri), {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const { data, metadata } = await resp.json();
  return {
    meta: meta(metadata),
    data: createDataset(data)
  };
}

const shopStats = ({
  key,
  count_all,
  count_bf,
  declared_sale,
  real_sale,
  percent_bf
}) => ({
  key,
  allProducts: parseInt(count_all),
  bfProducts: count_bf && parseInt(count_bf),
  avgClaimedDiscount: declared_sale && parseFloat(declared_sale) / 100,
  avgRealDiscount: real_sale && parseFloat(real_sale) / 100
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

export const initChart = detailUrl =>
  Promise.all([
    // when upgrading version do not forget to change `task-config.js\javascripts\external` entry
    import(
      "https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.bundle.min.js"
    ).then(() => import("../extension.js")),
    fetchDataSet(detailUrl)
  ]);

function naiveDiscount(currentPrice, actualPrice) {
  const origPrice = currentPrice
    .map(x => x.y)
    .filter(y => y)
    .shift();
  return (origPrice - actualPrice) / origPrice;
}

export function templateData(
  detailUrl,
  {
    meta: { shop, name, imageUrl, realDiscount },
    data: { currentPrice, originalPrice }
  }
) {
  const lastDeclaredPrice = originalPrice
    .map(x => x.y)
    .filter(y => y)
    .pop();
  const { y: actualPrice, x: date } = currentPrice.filter(({ y }) => y).pop();
  const discount = !realDiscount
    ? naiveDiscount(currentPrice, actualPrice)
    : realDiscount;
  return {
    detailUrl,
    name,
    shop,
    imageUrl,
    discount,
    actualPrice,
    date,
    lastDeclaredPrice
  };
}

export async function fetchDashboardData() {
  const resp = await retry(3, () =>
    fetch(`${apiHost}/shop-numbers`, {
      signal: signalTimeout(requestTimeout)
    })
  );
  if (!resp.ok) throw new Error("API error");
  const shopsData = await resp.json();
  const shopsStatsData = new Map(shopsData.map(shopStats).map(x => [x.key, x]));
  return Array.from(shops.entries()).map(([key, x]) =>
    Object.assign({}, x, shopsStatsData.get(key))
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
