export const LABEL = {
  START: "START",
  SUB_CATEGORY: "SUB_CATEGORY",
  CATEGORY: "CATEGORY",
  CATEGORY_PAGE: "CATEGORY_PAGE",
  PRODUCT_DETAIL: "PRODUCT_DETAIL"
};

export const ROOT = "https://www.pilulka.cz";
export const ROOT_SK = "https://www.pilulka.sk";

export const COUNTRY = {
  CZ: "CZ",
  SK: "SK"
};

export const ROOT_WEB_URL = country =>
  country === COUNTRY.CZ ? ROOT : ROOT_SK;
