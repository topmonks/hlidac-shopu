import Apify from "apify";

export function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getHeaders() {
  return {
    "User-Agent": Apify.utils.getRandomUserAgent()
  };
}

export const getSitemapUrls = body => {
  return body
    .replace(/\s+/g, "")
    .match(/(<loc>)(.*?)(<\/loc>)/g)
    .map(link => link.replace(/<loc>|<\/loc>/g, ""))
    .map(link => link);
};
