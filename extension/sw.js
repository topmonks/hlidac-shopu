"use strict";

const { runtime } = chrome || browser;

function getVersion() {
  return runtime.getManifest().version;
}

// Hot fix for #3551: extension-scraped prices can be a logged-in user's
// personalized price (member discount, club price). Submitting them as the
// product's day price poisoned the dataset. Until we can tell personalized
// from public prices reliably, drop currentPrice/originalPrice on the way
// out — /v2/detail only uses the request for chart lookup, not ingestion.
const SUBMIT_PRICES = false;

function fetchData(url, info) {
  const safeInfo = SUBMIT_PRICES ? info : { ...info, currentPrice: null, originalPrice: null };
  const searchString = new URLSearchParams(Object.entries(safeInfo).filter(([, val]) => Boolean(val)));
  searchString.append("url", url);
  searchString.append("ext", getVersion());
  return fetch(`https://api.hlidacshopu.cz/v2/detail?${searchString}`).then(resp => {
    if (resp.status === 404) {
      return resp.json();
    }
    if (!resp.ok) {
      throw new Error("HTTP error, status = " + resp.status);
    }
    return resp.json();
  });
}

runtime.onMessage.addListener(({ name, options }, sender, sendResponse) => {
  if (name === "hs-detail") {
    fetchData(options.url, options.info).then(sendResponse);
    return true;
  }
  return false;
});
