import Apify from "apify";
import { fetch } from "@adobe/helix-fetch";
import { DOMParser } from "linkedom";
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import {
  uploadToS3v2,
  invalidateCDN
} from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { retry } from "@hlidac-shopu/lib/remoting.mjs";

const Type = {
  DAILY: "daily",
  COUNT: "count",
  LINKED_DATA: "linked data"
};

const Label = {
  START: "start",
  DETAIL: "detail"
};

const countryPath = new Map([
  ["cz", "cz/cs"],
  ["sk", "sk/sk"],
  ["hu", "hu/hu"],
  ["pl", "pl/pl"],
  ["de", "de/de"],
  ["at", "at/de"]
]);

const feedUrl = (country, page) => {
  const slug = countryPath.get(country);
  const start = (page - 1) * 100;
  const end = start + 100;
  return `https://sik.search.blue.cdtapps.com/${slug}/special/more-products?special=all&start=${start}&end=${end}&subcategories-style=tree-navigation&c=lf&v=20211124&sort=RELEVANCE`;
};

async function main() {}

Apify.main(main);
