const { COUNTRY, BF } = require("./const");

function parsePrice(text) {
  return parseFloat(
    text
      .replace(/\s/g, "")
      .replace("Kč", "")
      .replace("€", "")
      .replace(",", ".")
      .trim()
  );
}

function enqueueCategories(cats) {
  let catUrls = [];
  for (const c of cats) {
    if (c.category && c.category.length > 0) {
      catUrls = catUrls.concat(enqueueCategories(c.category));
    } else {
      catUrls.push(c.url);
    }
  }
  return catUrls;
}

/**
 * create rootURL of dek site
 * @return {string}
 */
function getRootUrl() {
  const { country = COUNTRY.CZ } = global.userInput;
  return `https://www.dek.${country.toLowerCase()}`;
}

/**
 * return name of the table in keboola according the language
 * @return {string|string}
 */
function getTableName() {
  const { type, country = COUNTRY.CZ } = global.userInput;
  let tableName = `dek${country.toLowerCase()}`;
  if (type === BF) {
    tableName = `${tableName}_bf`;
  }
  return tableName;
}

module.exports = {
  getRootUrl,
  getTableName,
  enqueueCategories,
  parsePrice
};
