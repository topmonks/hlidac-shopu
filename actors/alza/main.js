import { HttpCrawler } from "@crawlee/http";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import { getInput } from "@hlidac-shopu/actors-common/crawler.js";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { cleanPrice } from "@hlidac-shopu/actors-common/product.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hckr_/apify-persistent-stats";
import { Actor, Dataset, log } from "apify";
import { ProxyAgent } from "undici";

// ========================================
// CRITICAL: Czech Price Parser
// ========================================
// Czech prices use \xa0 (non-breaking space) instead of regular space
// Example: "3 879,-" where space is \xa0, NOT regular space
function parsePrice(priceStr) {
  if (!priceStr) return null;
  try {
    const cleaned = priceStr
      .replace(/ /g, '')           // Regular space
      .replace(/\xa0/g, '')        // Non-breaking space (CRITICAL!)
      .replace(/,/g, '')           // Comma
      .replace(/-/g, '');          // Dash
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  } catch {
    return null;
  }
}

// ========================================
// Session Manager - Handles authentication
// ========================================
class AlzaSessionManager {
  constructor() {
    this.baseUrl = "https://www.alza.cz/services/restservice.svc";
    this.cookies = {
      platform: "androidtablet",
      ApV22: "2"
    };
    this.headers = {
      "user-agent": "okhttp/4.12.0;unknown/Generic_Android-x86_64;13;en_GB;2025.17.0;436;0;cz.alza.eshop",
      "accept": "application/json",
      "accept-language": "en-GB",
      "accept-encoding": "gzip",
      "content-type": "application/json; charset=utf-8"
    };
  }

  /**
   * Extract categoryId from a category URL by visiting it with mobile user agent
   * @param {string} url - Category URL (e.g., https://www.alza.cz/EN/computers-and-laptops)
   * @param {string} proxyUrl - Proxy URL
   * @returns {Promise<number|null>} - Extracted categoryId or null
   */
  async extractCategoryIdFromUrl(url, proxyUrl) {
    log.info(`Extracting categoryId from URL: ${url}`);

    try {
      // First, try to extract from URL pattern: /categoryName/12345.htm
      const urlMatch = url.match(/\/(\d+)\.htm/);
      if (urlMatch && urlMatch[1]) {
        const categoryId = parseInt(urlMatch[1], 10);
        log.info(`Extracted categoryId: ${categoryId} from URL pattern`);
        return categoryId;
      }

      // If not in URL, fetch the page and extract from HTML
      const fetchOptions = {
        headers: {
          ...this.headers,
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        },
        redirect: 'follow'
      };
      if (proxyUrl) {
        fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
      }

      const response = await fetch(url, fetchOptions);
      const html = await response.text();

      // Extract all category IDs using pattern: category/<id>?t=
      const regex = /category\/(\d+)\?t=/g;
      const allMatches = [];
      let match;
      while ((match = regex.exec(html)) !== null) {
        const id = parseInt(match[1], 10);
        if (!allMatches.includes(id)) {
          allMatches.push(id);
        }
      }

      if (allMatches.length === 0) {
        log.warning(`Could not extract categoryId from ${url}`);
        return null;
      }

      // If multiple categories found and first is 1 (Black Friday promo), use the second one
      let categoryId;
      if (allMatches.length > 1 && allMatches[0] === 1) {
        categoryId = allMatches[1];
        log.info(`Found multiple categories, skipping promotional category 1, using ${categoryId}`);
      } else {
        categoryId = allMatches[0];
      }

      log.info(`Extracted categoryId: ${categoryId} from ${url}`);
      return categoryId;
    } catch (error) {
      log.error(`Failed to extract categoryId from ${url}: ${error.message}`);
      return null;
    }
  }

  resetCookies() {
    this.cookies = {
      platform: "androidtablet",
      ApV22: "2"
    };
  }

  getCookies() {
    return { ...this.cookies };
  }

  getHeaders() {
    return { ...this.headers };
  }

  async performHandshake(proxyUrl) {
    log.info("Performing handshake with new session...");

    const fetchOptions = { headers: this.headers };
    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    }

    const response = await fetch(
      `${this.baseUrl}/v1/getAllDeliveryCountries?country=CZ`,
      fetchOptions
    );

    if (response.status !== 200) {
      throw new Error(`Handshake failed with status ${response.status}`);
    }

    // Extract cookies from Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      const cookies = setCookie.split(',').map(c => c.trim());
      for (const cookie of cookies) {
        const [nameValue] = cookie.split(';');
        const [name, value] = nameValue.split('=');
        if (['VST', 'lb_id', '__cf_bm', '_cfuvid'].includes(name)) {
          this.cookies[name] = value;
          log.info(`Got cookie: ${name}`);
        }
      }
    }

    if (!this.cookies.VST) {
      throw new Error("VST cookie not received from handshake");
    }

    log.info("Handshake successful");
  }

  async setCountry(proxyUrl) {
    log.info("Setting country to CZ...");

    const fetchOptions = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ countryId: 0 })
    };
    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    }

    const response = await fetch(
      `${this.baseUrl}/v1/setCountry?country=CZ`,
      fetchOptions
    );

    if (response.status !== 200) {
      throw new Error(`Set country failed with status ${response.status}`);
    }

    log.info("Country set to CZ");
  }

  async fetchProducts(page, categoryId, proxyUrl) {
    const url = `${this.baseUrl}/v2/products?categoryId=${categoryId}&country=CZ`;

    // Use MAILINGACTION for Black Friday (categoryId=1), CATEGORY for others
    const type = categoryId === 1 ? "MAILINGACTION" : "CATEGORY";

    const requestBody = {
      filterParameters: {
        id: categoryId,
        type: type,
        typeId: 0,
        orderBy: 0,
        page: page,
        availabilityType: 0,
        selectedBranches: [],
        sendPrices: false,
        params: [],
        producers: [],
        useRatingThreshold: false
      }
    };

    const fetchOptions = {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(requestBody)
    };
    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    }

    const response = await fetch(url, fetchOptions);

    if (response.status !== 200) {
      throw new Error(`Fetch products failed with status ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || data.data_cnt === 0) {
      return null;
    }

    return {
      products: data.data,
      breadcrumbs: data.breadcrumbs || [],
      count: data.data_cnt
    };
  }
}

// ========================================
// Proxy Rotation Handler
// ========================================
class ProxyRotationHandler {
  constructor(proxyConfiguration) {
    this.proxyConfiguration = proxyConfiguration;
    this.currentProxyUrl = null;
  }

  async getProxyUrl() {
    if (!this.proxyConfiguration) {
      return null;
    }
    if (!this.currentProxyUrl) {
      this.currentProxyUrl = await this.proxyConfiguration.newUrl();
    }
    return this.currentProxyUrl;
  }

  async rotateAndRefresh(sessionManager) {
    if (!this.proxyConfiguration) {
      log.warning("No proxy configuration available, cannot rotate");
      throw new Error("Cannot rotate proxy in development mode without proxy configuration");
    }

    log.warning("Rotating proxy and refreshing session...");

    // Get new proxy
    this.currentProxyUrl = await this.proxyConfiguration.newUrl();

    // Reset cookies
    sessionManager.resetCookies();

    // Perform fresh handshake with new proxy
    await sessionManager.performHandshake(this.currentProxyUrl);
    await sessionManager.setCountry(this.currentProxyUrl);

    log.info("Proxy rotated and session refreshed");
  }
}

// ========================================
// Product Normalization
// ========================================
function buildCategoryPath(breadcrumbs) {
  if (!breadcrumbs || breadcrumbs.length === 0) {
    return "Black Friday";
  }

  const categories = [];
  for (const crumb of breadcrumbs) {
    if (crumb.category && crumb.category.name) {
      categories.push(crumb.category.name);
    }
  }

  return categories.length > 0 ? categories.join(" > ") : "Black Friday";
}

function parseStockStatus(availStr) {
  if (!availStr) return false;
  return availStr.toLowerCase().includes("in stock");
}

function normalizeProduct(product, category) {
  // Parse prices
  const currentPrice = product.priceNoCurrency;  // Already numeric
  const originalPrice = parsePrice(product.cprice);  // CRITICAL: parse \xa0

  // Stock status
  const inStock = parseStockStatus(product.avail);

  // Compute discounted flag
  const discounted = (
    originalPrice !== null &&
    currentPrice !== null &&
    currentPrice < originalPrice
  );

  return {
    itemId: product.id,
    itemName: product.name,
    itemUrl: product.url,
    img: product.img,
    inStock: inStock,
    currentPrice: currentPrice,
    originalPrice: originalPrice,
    currency: "CZK",
    itemCode: product.code,
    rating: product.rating,
    breadCrumbs: category,
    discounted: discounted,
    slug: product.id
  };
}

// ========================================
// Rate Limit & Retry Handler
// ========================================
async function handleRequestWithRetry(requestFn, proxyHandler, sessionManager, retryCount = 0) {
  try {
    return await requestFn();
  } catch (error) {
    log.warning(`Request failed (attempt ${retryCount + 1}): ${error.message}`);

    if (retryCount < 3) {
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, retryCount + 1) * 1000;
      log.info(`Waiting ${delay}ms before retry...`);
      await new Promise(r => setTimeout(r, delay));
      return handleRequestWithRetry(requestFn, proxyHandler, sessionManager, retryCount + 1);
    } else {
      // Rotate proxy and retry with fresh handshake
      log.warning("Max retries reached, rotating proxy...");
      await proxyHandler.rotateAndRefresh(sessionManager);
      return handleRequestWithRetry(requestFn, proxyHandler, sessionManager, 0);
    }
  }
}

// ========================================
// Migration State Management
// ========================================
async function saveState(currentPage, totalProducts) {
  await Actor.setValue('STATE', {
    lastProcessedPage: currentPage,
    totalProducts: totalProducts,
    timestamp: Date.now()
  });
}

async function loadState() {
  const state = await Actor.getValue('STATE');
  if (state) {
    log.info(`Resuming from migration: page ${state.lastProcessedPage + 1}, ${state.totalProducts} products`);
    return {
      startPage: state.lastProcessedPage + 1,
      existingProducts: state.totalProducts
    };
  }
  return { startPage: 1, existingProducts: 0 };
}

// ========================================
// Main Actor Logic
// ========================================
async function main() {
  const rollbar = Rollbar.init();

  // 1. Get input
  const {
    development = false,
    proxyGroups = [],
    country = "CZ",
    type = ActorType.BlackFriday,
    urls = [],
    categoryId: inputCategoryId = null
  } = await getInput();

  // 2. Initialize proxy configuration
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups,
    useApifyProxy: !development
  });

  // 3. Initialize stats
  const stats = await withPersistedStats({
    pages: 0,
    products: 0,
    errors: 0,
    proxyRotations: 0
  });

  // 4. Check for migration state
  const { startPage, existingProducts } = await loadState();
  log.info(`Starting from page ${startPage} (${existingProducts} existing products)`);

  // 5. Initialize session manager and proxy handler
  const sessionManager = new AlzaSessionManager();
  const proxyHandler = new ProxyRotationHandler(proxyConfiguration);

  // ALWAYS perform fresh handshake (ignore saved cookies after migration)
  const proxyUrl = await proxyHandler.getProxyUrl();
  await sessionManager.performHandshake(proxyUrl);
  await sessionManager.setCountry(proxyUrl);

  // 5b. Determine categoryId: from URL, input, or default
  let categoryId = inputCategoryId;

  if (!categoryId && urls.length > 0) {
    // Extract categoryId from first URL
    categoryId = await sessionManager.extractCategoryIdFromUrl(urls[0], proxyUrl);
    if (!categoryId) {
      throw new Error(`Could not extract categoryId from URL: ${urls[0]}`);
    }
  } else if (!categoryId) {
    // Default to Black Friday
    categoryId = 1;
  }

  log.info(`Configuration: categoryId=${categoryId}, country=${country}, type=${type}`);

  // 6. Get category info (for breadcrumbs)
  let category = "Black Friday";
  try {
    const categoryUrl = `${sessionManager.baseUrl}/v1/category/${categoryId}?t=MAILINGACTION&p=0&country=CZ`;
    const fetchOptions = { headers: sessionManager.getHeaders() };
    if (proxyUrl) {
      fetchOptions.dispatcher = new ProxyAgent(proxyUrl);
    }
    const categoryResp = await fetch(categoryUrl, fetchOptions);
    if (categoryResp.status === 200) {
      const categoryData = await categoryResp.json();
      const categoryName = categoryData.priceKiller?.name || categoryData.name || 'Unknown';
      category = categoryName;
      log.info(`Category: ${categoryName}`);
    }
  } catch (e) {
    log.warning(`Failed to get category info: ${e.message}`);
  }

  // 7. Scrape all pages
  let currentPage = startPage;
  let emptyPagesCount = 0;
  const MAX_EMPTY_PAGES = 3;

  while (emptyPagesCount < MAX_EMPTY_PAGES) {
    try {
      log.info(`Scraping page ${currentPage}...`);

      // Fetch products with retry & rotation
      const result = await handleRequestWithRetry(
        () => sessionManager.fetchProducts(currentPage, categoryId, proxyHandler.currentProxyUrl),
        proxyHandler,
        sessionManager
      );

      if (!result || !result.products || result.products.length === 0) {
        log.warning(`No products on page ${currentPage}`);
        emptyPagesCount++;
        currentPage++;
        continue;
      }

      emptyPagesCount = 0;  // Reset counter

      // Extract category from breadcrumbs
      if (result.breadcrumbs && result.breadcrumbs.length > 0) {
        category = buildCategoryPath(result.breadcrumbs);
      }

      // Normalize and push to dataset
      for (const product of result.products) {
        const normalized = normalizeProduct(product, category);
        await Dataset.pushData(normalized);
        stats.inc('products');
      }

      stats.inc('pages');
      const currentStats = stats.get();
      log.info(`✓ Page ${currentPage}: ${result.products.length} products (total: ${currentStats.products})`);

      // Save state every 10 pages (migration protection)
      if (currentPage % 10 === 0) {
        await saveState(currentPage, currentStats.products);
        log.info(`State saved at page ${currentPage}`);
      }

      currentPage++;

    } catch (error) {
      log.error(`Page ${currentPage} failed: ${error.message}`);
      rollbar.error(error, { page: currentPage });
      stats.inc('errors');
      currentPage++;
    }
  }

  const finalStats = stats.get();
  log.info(`Scraping complete: ${finalStats.pages} pages, ${finalStats.products} products`);

  // 8. Save final stats
  await stats.save(true);

  // 9. Upload to Keboola
  try {
    const tableName = `alza_${country.toLowerCase()}_bf`;
    log.info(`Uploading to Keboola table: ${tableName}`);
    await uploadToKeboola(tableName);
    log.info("Keboola upload successful");
  } catch (err) {
    log.error(`Keboola upload failed: ${err.message}`);
    rollbar.error(err);
  }
}

await Actor.main(main, { statusMessage: "DONE" });
