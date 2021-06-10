const Apify = require("apify");

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getHeaders() {
  return {
    "User-Agent": Apify.utils.getRandomUserAgent()
  };
}

const getSitemapUrls = body => {
  return body
    .replace(/\s+/g, "")
    .match(/(<loc>)(.*?)(<\/loc>)/g)
    .map(link => link.replace(/<loc>|<\/loc>/g, ""))
    .map(link => link);
};

module.exports = { getRandomInt, getHeaders, getSitemapUrls };
