"use strict";

const { runtime } = chrome || browser;

function getVersion() {
  return runtime.getManifest().version;
}

function fetchData(url, info) {
  const searchString = new URLSearchParams(Object.entries(info).filter(([, val]) => Boolean(val)));
  searchString.append("url", url);
  searchString.append("ext", getVersion());
  console.log(searchString.toString());
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
