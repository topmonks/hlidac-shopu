# hornbach-daily

Scrapes hornbach.cz / hornbach.sk category listings.

Categories start at https://www.hornbach.cz/c/ and are walked depth-first:
`TOP_CATEGORIES` → `SUB_CATEGORIES` (recursive) → `CAT_PRODUCTS`. A category page
with no further subcategory cards is a leaf, and product listings are then queued
for the leaf and every category above it in the crumb trail.

Products and the page count both come from the Apollo cache embedded in the
listing HTML (`window.__APOLLO_STATE__` → `ROOT_QUERY.categoryListing(...)`),
not from the DOM. Page size is 72, but `listing.pageCount` is authoritative —
don't reintroduce a hardcoded divisor.

## Actor's INPUT

```json
{
  "country": "CZ",
  "type": "FULL",
  "debug": false,
  "maxRequestRetries": 8,
  "maxRequestsPerMinute": 600,
  "maxConcurrency": 10
}
```

```text
"country": "CZ" || "SK"
"type":    "FULL" || "TEST"
```

`TEST` keeps only the first 2 requests at each level, which is enough to exercise
the whole pipeline in about 30 seconds.

## Actor's item example OUTPUT

```json
{
  "itemId": "10702323",
  "itemName": "Barva na zeď Hornbach Sněhobílá profesionální bez konzervantů 16 kg",
  "itemUrl": "https://www.hornbach.cz/p/barva-na-zed-hornbach-snehobila-profesionalni-bez-konzervantu-16-kg/10702323/",
  "img": "https://media.hornbach.cz/hb/packshot/as.71177684.jpg?dvid=7",
  "currentPrice": 1199,
  "currentUnitPrice": 74.94,
  "category": {
    "link": "https://www.hornbach.cz/c/barvy-tapety-a-oblozeni-sten/barvy-laky/S12032/",
    "title": "Barvy, laky"
  },
  "currency": "CZK"
}
```

`currentUnitPrice` is `""` for products sold per piece — roughly a third of items.
Because ancestor categories are scraped as well as leaves, a product legitimately
appears once per category it belongs to.

## Fastly bot protection

Hornbach sits behind Fastly Bot Management. A request it doesn't like gets
**HTTP 200 with a ~3 KB "Client Challenge" stub** that loads
`/_fs-ch-<token>/script.js` instead of the page. Nothing fails, so the breakage
is silent: in August 2026 the actor "succeeded" with `requestsFailed: 0` while
scraping 0 items, because the start page matched no selectors and the queue
drained. **A run reporting 0 items and 0 failures is this, not a selector break.**

Measured pass rates for a Chrome-TLS HTTP client holding no challenge cookie:

| Origin | Passes |
| --- | --- |
| Apify residential CZ (`CZECH_LUMINATI`) | 0/40 |
| Apify datacenter (`SHADER`, `GERMANY`) | 0/8 |
| Consumer IP | ~60%, intermittent |

So **adding a proxy does not help** — every Apify proxy IP is challenged, which
is why this actor deliberately runs without `proxyConfiguration`. Proxy
*tunnelling* is not the trigger either: the same client through a local CONNECT
proxy on a consumer IP passes at the unproxied rate. It is IP reputation.

The fix is the two-phase split that `datart-daily` (F5) and `lidl-daily` (Myra)
already use:

1. **Solver** — cloakbrowser executes the sensor script and clears the challenge
   in ~2 s, yielding a long-lived `_fs_ch_cp_` ("challenge passed") cookie.
2. **Executor** — `impit` with a Chrome TLS fingerprint replays that cookie.
   Fastly fingerprints the handshake on *every* request, so node fetch /
   got-scraping / curl-OpenSSL stay challenged even holding a valid cookie.

Verified 10/10 on an IP where impit alone was blocked 100% of the time.

### Two traps worth keeping in mind

**A challenged client never recovers.** It keeps the challenge's own
`_fs_ch_st_` cookie (10 s TTL, refreshed on every challenged response) and stays
challenged indefinitely — measured **0/10** when retrying on the same `Impit`
instance versus **9/10** when the instance is discarded on the first challenge
and reused while it keeps working. A single challenge would otherwise deadlock
the whole crawl. Hence: a challenge rotates the executor client, and
`_fs_ch_st_` is stripped from the solved cookies rather than replayed all run.

**A solve does not always earn a pass cookie, and that must force a re-solve.**
If Fastly happens not to be challenging at the moment the browser runs, the
solver clears the page and returns only the `hb*` session cookies — the log says
`IP not challenged`. The executor is then unprotected, and when Fastly starts
challenging it, *retries alone can never recover*: only a real browser solve can.
An earlier version of this actor throttled re-solves on the theory that a
challenge right after a fresh solve was random noise. That starved the crawl —
one test run logged 91 challenges, 0 re-solves and 0 items. So every challenged
response now triggers a re-solve, with a mutex (not a cooldown) keeping
concurrent workers from stampeding cloakbrowser. This matches `datart-daily` and
`lidl-daily`, which re-solve on every block for the same reason.

## Notes for maintainers

- `maxRequestRetries` is passed to `getInput()` as an **override**, because
  `getInput()` itself defaults it to 3 — a destructuring default can never win
  against that. (`albert/main.js` has the same dead `= 5` default.)
- Enqueueing goes through `crawler.requestQueue.addRequests(...)` like the other
  14 actors that do it, rather than an explicitly opened queue. `Actor.openRequestQueue()`
  returns a V2 queue in this Crawlee version and every actor in the repo runs on
  V2, `forefront` included, so there is no reason to special-case this one.
- The Dockerfile needs the `playwright-chrome` base image, and
  `impit-linux-x64-gnu` stays a direct dependency so impit's native binary
  survives `npm install --omit=optional`.
- `@crawlee/{core,types,utils}` are pinned to 3.17.0 as direct dependencies to
  match `@crawlee/basic`. **Don't drop these when bumping deps.** `@crawlee/basic`
  requires `@crawlee/core` at exactly its own version while `apify` requires
  `^3.14.1`; the Dockerfile installs from `package.json` with npm and no
  lockfile, so without the pins npm keeps the base image's newer `@crawlee/core`
  and nests an older copy under `@crawlee/basic`, and `Actor.init` throws
  `Detected incompatible Crawlee version` before the first request. Pin all
  three — pinning only `core` still leaves `types`/`utils` split. Not via npm
  `overrides`: the repo is yarn-managed and reviewers reject those.
- Category names must be read off each slider card (`link.querySelector("p")`),
  never via `document.querySelector` — the latter labels every category on a page
  with the first card's name.
