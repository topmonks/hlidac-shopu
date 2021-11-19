const LABELS = {
  START: "START",
  PAGE: "PAGE"
};
const COUNTRY_TYPE = {
  CZ: "CZ",
  SK: "SK"
};
const BASE_URL = (country = COUNTRY_TYPE.CZ, page = 1) =>
  `https://www.aaaauto.${country.toLowerCase()}/${country.toLowerCase()}/cars.php?carlist=1&limit=50&page=${page}&modern-request&origListURL=%2F${
    country === COUNTRY_TYPE.CZ ? "ojete-vozy" : "ojazdene-vozidla"
  }%2F`;

const HEADER = {
  Connection: "keep-alive",
  Accept: "application/json, text/javascript, */*; q=0.01",
  "X-Requested-With": "XMLHttpRequest"
};

module.exports = {
  LABELS,
  COUNTRY_TYPE,
  BASE_URL,
  HEADER
};
