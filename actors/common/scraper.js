const Apify = require("apify");
const { log } = Apify.utils;
const rollbar = require("@hlidac-shopu/actors-common/rollbar.js");
const { gotScraping } = require("got-scraping");
const cheerio = require("cheerio");

const COUNTRY = {
  CZ: "CZ",
  SK: "SK",
  PL: "PL",
  HU: "HU",
  DE: "DE",
  AT: "AT"
};

const LABELS = {
  START: "START",
  LIST: "LIST",
  CATEGORY: "CATEGORY",
  SUB_CATEGORY: "SUB_CATEGORY",
  DETAIL: "DETAIL",
  CATEGORY_NEXT: "CATEGORY_NEXT",
  BF: "BF"
};

const defaultInput = {
  development: false,
  debug: false,
  maxRequestRetries: 3,
  maxConcurrency: 10,
  type: "FULL",
  proxyGroups: ["CZECH_LUMINATI"],
  country: COUNTRY.CZ
};

const defaultStats = {
  categories: 0,
  pages: 0,
  items: 0,
  itemsDuplicity: 0,
  totalItems: 0,
  failed: 0
};

async function init() {
  rollbar.init();
  //Input settings
  const getInput = await Apify.getInput();
  const input = { ...defaultInput, ...getInput };
  //Stats
  const getStats = await Apify.getValue("STATS");
  const stats = getStats ?? defaultStats;

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();

  /** @type {ProxyConfiguration} */
  const proxyConfiguration = await Apify.createProxyConfiguration({
    groups: input.proxyGroups,
    useApifyProxy: !input.development
  });

  return {
    input,
    stats,
    requestQueue,
    log,
    LABELS,
    proxyConfiguration
  };
}

async function doScraping(request, proxyConfiguration, headers = null) {
  const {
    url,
    userData: { label }
  } = request;
  let gotOptions = {
    headerGeneratorOptions: {
      browsers: [
        {
          name: "chrome",
          minVersion: 89
        }
      ],
      devices: ["desktop"],
      locales: ["cs-CZ"],
      operatingSystems: ["windows", "linux"]
    },
    url: url
  };
  if (proxyConfiguration)
    gotOptions = {
      ...gotOptions,
      ...{ proxyUrl: proxyConfiguration.newUrl() }
    };
  if (headers)
    gotOptions = {
      ...gotOptions,
      ...headers
    };
  const response = await gotScraping.get(gotOptions);
  const { statusCode, body } = response;
  if (statusCode !== 200) {
    return null;
  }
  return body;
}

async function getCheerioObject(request, proxyConfiguration) {
  const body = await doScraping(request, proxyConfiguration);
  if (body) {
    return cheerio.load(body);
  }
}

async function getJSONObject(request, proxyConfiguration) {
  const body = await doScraping(request, proxyConfiguration, {
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    }
  });
  try {
    return JSON.parse(body);
  } catch (e) {
    log.error(`Failed ${e.message}`);
    return false;
  }
}

module.exports = {
  init,
  getCheerioObject,
  getJSONObject
};
