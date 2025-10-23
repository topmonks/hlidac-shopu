---
name: Hlidac Shopu Actors Maintenance
description: Guide for maintaining and debugging web scraping actors in the Hlidac Shopu monorepo
---

# Hlidac Shopu Actors Maintenance Guide

This guide provides AI agents with essential context for maintaining, debugging, and fixing actors in the Hlidac Shopu monorepo.

## Overview

Hlidac Shopu is a Czech price comparison platform that scrapes product data from various e-commerce websites. The `actors/` directory contains individual Apify actors for each supported shop. Actors share common functionality via `@hlidac-shopu/actors-common` package.

## Common Issues

### Website Redesigns Breaking Selectors

E-commerce sites frequently redesign their HTML structure, breaking existing CSS selectors.

**Symptoms:**
- Drastically reduced product counts (e.g., 200 instead of 23,000)
- Zero pagination detected
- Missing data fields in output

**Examples from recent fixes:**

**Benu.cz pagination (main.js:199-204)**
```javascript
// Before: Selector returned 0 results
const maxPage = document.querySelectorAll("p.paging a:not(.next):not(.ico-arr-right)").at(-1)?.innerText?.trim() ?? 0;

// After: Updated to match new HTML structure
const paginationLinks = document.querySelectorAll("nav.paging ul.pager li a");
const pageNumbers = Array.from(paginationLinks)
  .map(a => parseInt(a.innerText.trim()))
  .filter(n => !isNaN(n));
const maxPage = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 0;
```

**Datart.cz pagination**
```javascript
// Before: Old selector structure
const lastPageLink = document.querySelector('.pagination .pagination-item:last-child a');

// After: New nested structure
const lastPageLink = document.querySelector('nav[aria-label="pagination"] ul li:last-child a');
```

### Client-Side Rendering Preventing DOM Scraping

Many modern sites use JavaScript to render content after initial HTML load. HttpCrawler only receives the initial HTML without executing JavaScript.

**Symptoms:**
- Selectors work in browser DevTools but fail in actor
- Missing price data, especially originalPrice/discount information
- Empty fields that are visible on the website

**Solution:** Use API endpoints instead of DOM scraping.

**Benu.cz originalPrice via API (main.js:54-70)**
```javascript
// DOM scraping fails because prices are rendered client-side
// Solution: Extract product ID and call API directly
let originalPrice = null;
const apiMatch = html.match(/api\/base\/v1\/products\/(\d+)/);
if (apiMatch) {
  const productId = apiMatch[1];
  try {
    const apiUrl = `https://www.benu.cz/api/base/v1/products/${productId}`;
    const response = await sendRequest({ url: apiUrl });
    const apiData = JSON.parse(response.body);
    const rrpPrice = apiData?.data?.attributes?.price?.rrpPrice;
    if (rrpPrice && rrpPrice !== currentPrice) {
      originalPrice = rrpPrice;
    }
  } catch (e) {
    log.warning(`Failed to fetch price data from API for product ${productId}:`, e.message);
  }
}
```

**Lidl.cz full API-based approach**
```javascript
// Website redesign made DOM scraping unreliable
// Solution: Switched entirely to API endpoints
const response = await sendRequest({ url: apiUrl });
const data = JSON.parse(response.body);
// Extract pagination from API response
const totalPages = data.pagination?.totalPages || 1;
```

## Debugging Workflow

### 1. Verify the Issue

Check recent Apify runs to confirm the problem:
```bash
apify runs ls
apify run info <run-id>
```

Examine output dataset:
```bash
ls -la storage/datasets/default/
cat storage/datasets/default/000000001.json
```

### 2. Use Browser DevTools to Inspect Current State

Open the target website in a browser and:

**Check selectors:**
```javascript
// Run in browser console to test selectors
document.querySelectorAll("nav.paging ul.pager li a")
document.querySelector("#snippet-productRichSnippet-richSnippet")
```

**Discover API endpoints:**
1. Open DevTools Network tab
2. Filter by XHR/Fetch
3. Navigate the website (pagination, product pages)
4. Look for JSON responses containing the data you need
5. Note the API URL patterns and request parameters

**Verify client-side rendering:**
1. View Page Source (Ctrl+U) - shows initial HTML
2. Compare with Inspect Element - shows rendered DOM
3. If data only appears in rendered DOM, it's client-side rendered

### 3. Test Fixes Locally

Create a test input file:
```json
{
  "development": true,
  "debug": false,
  "maxRequestRetries": 1,
  "type": "TEST"
}
```

Run with test input:
```bash
apify run --purge --input-file test-input.json
```

For quick validation, use `ActorType.Test` mode which limits scraping to a single category or product.

### 4. Verify Dataset Output

After test run completes:
```bash
# Check number of products scraped
ls storage/datasets/default/ | wc -l

# Verify data structure
cat storage/datasets/default/000000001.json | jq .

# Check for specific fields
cat storage/datasets/default/*.json | jq '.originalPrice' | grep -v null
```

## Common Patterns

### Pagination Extraction

Most actors follow this pattern in the PAGE handler:

```javascript
case Labels.PAGE: {
  // Extract maximum page number from pagination controls
  const paginationLinks = document.querySelectorAll("PAGINATION_SELECTOR");
  const pageNumbers = Array.from(paginationLinks)
    .map(a => parseInt(a.innerText.trim()))
    .filter(n => !isNaN(n));
  const maxPage = pageNumbers.length > 0 ? Math.max(...pageNumbers) : 0;

  // Process products on current page
  const requests = productListingRequests(document);
  await crawler.requestQueue.addRequests(requests);

  // Add remaining pages to queue
  if (maxPage > 1) {
    const paginationPages = [];
    for (let i = 2; i <= maxPage; i++) {
      paginationPages.push({
        url: `${request.url}?page=${i}`,
        userData: { label: Labels.PAGI_PAGE }
      });
    }
    await crawler.requestQueue.addRequests(paginationPages);
  }
}
```

### Price Extraction

Standard product schema includes:
- `currentPrice`: Current selling price (required)
- `originalPrice`: Original/retail price before discount (optional)
- `discounted`: Boolean indicating if product is on sale

```javascript
return {
  itemId,
  itemName,
  itemUrl,
  img,
  currentPrice,
  originalPrice,
  discounted: originalPrice ? currentPrice < originalPrice : false,
  // ... other fields
};
```

### Product Listing Requests

Standard pattern for extracting product links from category pages:

```javascript
function productListingRequests(document) {
  const products = document.querySelectorAll("PRODUCT_LINK_SELECTOR").map(product => {
    const url = product.getAttribute("href");
    return {
      url: url.startsWith("http") ? url : `${baseUrl}${url}`,
      userData: { label: Labels.DETAIL }
    };
  });
  log.info(`Found ${products.length} products`);
  return products;
}
```

## Testing Strategy

### Local Testing Workflow

1. **Quick validation** with TEST mode (1 category, few products)
2. **Limited scope** with BLACK_FRIDAY mode or page limits
3. **Full run** with production settings

### Test Input Files

Create `test-input.json` in actor directory:

```json
{
  "development": true,
  "debug": false,
  "maxRequestRetries": 1,
  "type": "TEST"
}
```

Available types (defined in `@hlidac-shopu/actors-common/actor-type.js`):
- `Full`: Complete scrape of all categories
- `Test`: Single category or product for quick testing
- `BlackFriday`: Special Black Friday categories

### Dataset Verification

Verify the output matches expectations:

```bash
# Count total items
ls storage/datasets/default/*.json | wc -l

# Check for required fields
jq -s 'map(select(.itemId == null or .currentPrice == null))' storage/datasets/default/*.json

# Verify discount logic
jq -s 'map(select(.discounted == true and (.originalPrice == null or .originalPrice <= .currentPrice)))' storage/datasets/default/*.json
```

## Git Workflow

### Creating Fixes

1. **Create feature branch** from trunk:
```bash
git checkout trunk
git pull upstream trunk
git checkout -b fix/ISSUE_NUMBER-shop-name
```

2. **Make changes** and test thoroughly

3. **Commit** with clear message:
```bash
git add actors/SHOP-daily/main.js
git commit -m "fix(SHOP): update selectors for website redesign

- Update pagination selector to match new HTML structure
- Fix originalPrice extraction via API endpoint
- Fixes #ISSUE_NUMBER"
```

### Creating Pull Requests

1. **Push to upstream** repository (not fork):
```bash
git push upstream fix/ISSUE_NUMBER-shop-name
```

2. **Create PR** targeting `trunk` branch

3. **Ensure clean commits** - PR should only contain changes for the specific shop being fixed

If branch contains unrelated commits, use cherry-pick:
```bash
# Create clean branch
git checkout trunk
git checkout -b fix/ISSUE_NUMBER-shop-name-clean

# Cherry-pick only relevant commit
git cherry-pick COMMIT_HASH

# Replace old branch
git branch -D fix/ISSUE_NUMBER-shop-name
git branch -m fix/ISSUE_NUMBER-shop-name
git push -f upstream fix/ISSUE_NUMBER-shop-name
```

## Actor Registration

After creating a new actor, register it in `lib/shops.mjs`:

```javascript
{
  name: "Shop Name",
  url: "https://www.shop.cz",
  actor: "shop-daily",
  // ... other properties
}
```

## Common Files

- `main.js`: Actor entry point with request handlers
- `.actor/input_schema.json`: Actor input configuration
- `README.md`: Actor-specific documentation (see actors/README.md for template)
- `NOTES.md`: Development notes and considerations

## Resources

- Actor development guidelines: `actors/README.md`
- Development tips: `actors/NOTES.md`
- Shared utilities: `@hlidac-shopu/actors-common` package
- Apify documentation: https://docs.apify.com
