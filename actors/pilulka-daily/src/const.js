const LABEL = {
  START: "START",
  SUB_CATEGORY: "SUB_CATEGORY",
  CATEGORY: "CATEGORY",
  CATEGORY_PAGE: "CATEGORY_PAGE",
  PRODUCT_DETAIL: "PRODUCT_DETAIL"
};

const ROOT = "https://www.pilulka.cz";
const ROOT_SK = "https://www.pilulka.sk";

const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

const ROOT_WEB_URL = country => (country === COUNTRY.CZ ? ROOT : ROOT_SK);

module.exports = {
  LABEL,
  COUNTRY,
  ROOT,
  ROOT_SK,
  ROOT_WEB_URL
};
