import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { COUNTRY } from "./main.js";

export function parsePrice(text) {
  return parseFloat(
    text
      .replace(/\s/g, "")
      .replace("Kč", "")
      .replace("€", "")
      .replace(",", ".")
      .trim()
  );
}

export function enqueueCategories(cats) {
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
export function getRootUrl(userInput) {
  const { country = COUNTRY.CZ } = userInput;
  return `https://www.dek.${country.toLowerCase()}`;
}

/**
 * return name of the table in keboola according the language
 * @return {string|string}
 */
export function getTableName(userInput) {
  const { type, country = COUNTRY.CZ } = userInput;
  let tableName = `dek_${country.toLowerCase()}`;
  if (type === ActorType.BF) {
    tableName = `${tableName}_bf`;
  }
  return tableName;
}
