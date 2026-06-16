"use strict";

const { runtime } = chrome || browser;

function getVersion() {
  return runtime.getManifest().version;
}

// Hot fix for #3551: extension-scraped prices can be a logged-in user's
// personalized price (member discount, club price). Submitting them as the
// product's day price poisoned the dataset. Until we can tell personalized
// from public prices reliably, do not submit currentPrice/originalPrice to the
// API; apply them locally to the returned chart data instead.
const SUBMIT_PRICES = false;

function parsePrice(price) {
  if (price === null || price === undefined) return null;
  const value = Number.parseFloat(price);
  return Number.isFinite(value) ? value : null;
}

function discount(referencePrice, currentPrice) {
  if (!referencePrice) return null;
  if (currentPrice === null) return null;
  return (referencePrice - currentPrice) / referencePrice;
}

function applyLocalPrices(response, info) {
  const currentPrice = parsePrice(info.currentPrice);
  if (!response?.data || !response?.metadata || currentPrice === null) return response;

  const originalPrice = parsePrice(info.originalPrice);
  const date = new Date().toISOString();
  const referencePrice =
    response.metadata.type === "eu-minimum" ? response.metadata.minPrice : response.metadata.commonPrice;

  return {
    ...response,
    data: {
      ...response.data,
      currentPrice: [...(response.data.currentPrice ?? []), { x: date, y: currentPrice }],
      originalPrice: [...(response.data.originalPrice ?? []), { x: date, y: originalPrice }]
    },
    metadata: {
      ...response.metadata,
      currentPrice,
      realDiscount: discount(referencePrice, currentPrice),
      claimedDiscount: discount(originalPrice, currentPrice)
    }
  };
}

function fetchData(url, info) {
  const safeInfo = SUBMIT_PRICES ? info : { ...info, currentPrice: null, originalPrice: null };
  const searchString = new URLSearchParams(Object.entries(safeInfo).filter(([, val]) => Boolean(val)));
  searchString.append("url", url);
  searchString.append("ext", getVersion());
  return fetch(`https://api.hlidacshopu.cz/v2/detail?${searchString}`)
    .then(resp => {
      if (resp.status === 404) {
        return resp.json();
      }
      if (!resp.ok) {
        throw new Error("HTTP error, status = " + resp.status);
      }
      return resp.json();
    })
    .then(response => (SUBMIT_PRICES ? response : applyLocalPrices(response, info)));
}

runtime.onMessage.addListener(({ name, options }, sender, sendResponse) => {
  if (name === "hs-detail") {
    fetchData(options.url, options.info).then(sendResponse);
    return true;
  }
  return false;
});
