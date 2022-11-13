import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";

export const Label = {
  START: "START",
  PAGE: "PAGE"
};
export const Country = {
  CZ: "CZ",
  SK: "SK"
};

const categoryByCountry = new Map([
  [Country.CZ, "ojete-vozy"],
  [Country.SK, "ojazdene-vozidla"]
]);

export function getRootUrl(type = ActorType.Full, country = Country.CZ) {
  const tld = country.toLocaleLowerCase();
  const origin = `https://www.aaaauto.${tld}`;
  const category = categoryByCountry.get(country);
  const root = `${origin}/${tld}/cars.php?carlist=1&limit=50&page=1&modern-request&origListURL=%2F${category}%2F`;

  switch (type) {
    case ActorType.Full:
      return root;
    case ActorType.Test:
      return root.replace("limit=50", "limit=1");
    case ActorType.BlackFriday:
      return `${origin}/black-friday/?category=92&limit=50`;
  }
}

export function getBaseUrl(
  type = ActorType.Full,
  country = Country.CZ,
  page = 1
) {
  const tld = country.toLocaleLowerCase();
  const origin = `https://www.aaaauto.${tld}`;
  const category = categoryByCountry.get(country);

  switch (type) {
    case ActorType.Test:
      return `${origin}/${tld}/cars.php?carlist=1&limit=1&page=1&modern-request&origListURL=%2F${category}%2F`;
    case ActorType.Full:
      return `${origin}/${tld}/cars.php?carlist=1&limit=50&page=${page}&modern-request&origListURL=%2F${category}%2F`;
    case ActorType.BlackFriday:
      return `${origin}/black-friday/?category=92&limit=50&page=${page}`;
  }
}

/**
 *
 * @param {String} string
 * @returns {number|undefined}
 */
export function extractPrice(string) {
  const match = string.match(/[\d*\s]*\s[Kč|€]/g);
  if (!match) return;

  const value = match[0]
    .replace(/\s/g, "")
    .replace("Kč", "")
    .replace("€", "")
    .replace("Cena", "");
  return parseInt(value);
}

/**
 * @param {number} min
 * @param {number} max
 * @return {number}
 */
export function getHumanDelayMillis(min = 400, max = 800) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
