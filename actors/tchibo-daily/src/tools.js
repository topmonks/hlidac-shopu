import { LABELS } from "./const.js";

export function getCurrencyISO(country) {
  let currency;
  switch (country) {
    case "cz":
      currency = "CZK";
      break;
    case "sk":
    case "de":
    case "at":
      currency = "EUR";
      break;
    case "ch":
      currency = "CHF";
      break;
    case "pl":
      currency = "PLN";
      break;
    case "hu":
      currency = "HUF";
      break;
    case "com.tr":
      currency = "TRY";
      break;
    default:
      currency = null;
  }
  return currency;
}

// TODO: do not use globals
export function createInitRequests() {
  const { country = "cz" } = global.userInput;
  global.currency = getCurrencyISO(country);
  return [
    {
      url: `https://www.tchibo.${country}/jsonflyoutnavigation`,
      userData: {
        label: LABELS.NAVIGATION
      }
    }
  ];
}

export function parsePrice(price) {
  const { country = "cz" } = global.userInput;
  price = price.replace(/\s/, "").replace(",", ".");
  price = price.match(/[\d+|.]+/)[0];
  price = parseFloat(price);
  if (country === "de") {
    return price / 100;
  } else {
    return price;
  }
}

export function getCoffeeCategory() {
  const { country = "cz" } = global.userInput;
  switch (country) {
    case "cz":
      return "Káva";
    case "sk":
      return "Káva";
    case "de":
      return "Kaffee";
    case "ch":
      return "Kaffee";
    case "pl":
      return "Kawa";
    case "hu":
      return "Kávé";
    case "at":
      return "Kaffee";
    case "com.tr":
      return "Kahve";
  }
}

// TODO: use lib/shops.mjs shop.parse(url) instead
/** @deprecated */
export function getSlug(url) {
  const urlArr = url.split("/");
  let slug = urlArr[urlArr.length - 1];
  slug = slug.replace(".html", "");
  return slug;
}
