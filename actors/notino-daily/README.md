# 24.8.2026 — přechod na sitemap (GH #3587)

Aktor vracel jen ~8K z ~90K produktů. Příčina: procházení kategorií + stránkování přestalo
fungovat. Stránkovací URL kategorií (`...?f=<...>`) vrací **403 od Cloudflare Bot Management**
(cookie `__cf_bm`) pro ne-prohlížečové klienty na **všech** proxy skupinách (ověřeno přes
got-scraping / Apify Proxy: RESIDENTIAL, datacenter i country-DC), takže stránkování se nikdy
nedostalo za 1. stránku (~28 produktů/kategorie). Homepage „warm-up" cookies to neřeší a žádné
JSON API pro výpis produktů neexistuje (grid je server-rendered v té samé Cloudflare-blokované
`?f=` HTML).

**Řešení:** produkty se objevují ze **sitemapy** místo procházení kategorií.
`sitemap.xml` → produktové sub-sitemapy (`sitemap_detail_*_cz.xml`, bez `reviews`) → ~63K
unikátních detail URL, aktualizováno denně (`<lastmod>` = dnes). Detailní stránky produktů
**nejsou** Cloudflare-blokované (vrací `__APOLLO_STATE__` přes obyčejné HTTP), takže parser
detailu zůstává beze změny. 63K detail stránek × ~1,5–2 varianty ≈ ~90K řádků = očekávaný objem.

Black Friday (`type=BF`) stále používá staré procházení kategorií (mimo rozsah #3587; nejspíš
narazí na stejnou Cloudflare zeď — před listopadem prověřit). Původní discovery přes homepage menu
je dohledatelné v git historii `main.js`. Detaily viz hlavička `main.js`.

---

Značná část requestů končí s chybou 502 nebo s chybovou hláškou

```
ERROR CheerioCrawler: handleRequestFunction failed, reclaiming failed request back to the list or queue {"url":"https://www.notino.cz/montale/starry-nights-parfemovana-voda-unisex/","retryCount":2,"id":"tNVevl0405WlnW8"}
  CredentialsProviderError: Could not load credentials from any providers
      at /home/thujer/Projects/_TopMonks/apify/hlidac-shopu/node_modules/@aws-sdk/credential-provider-node/dist-cjs/defaultProvider.js:19:15
      at /home/thujer/Projects/_TopMonks/apify/hlidac-shopu/node_modules/@aws-sdk/property-provider/dist-cjs/chain.js:11:28
      at runMicrotasks (<anonymous>)
      at processTicksAndRejections (node:internal/process/task_queues:96:5)
```

7.4.2022

Přidán kód pro počítání produktů ze sitemaps.

Za předpokladu, že v sitemap jsou všechny produkty

V CZ verzi by mělo být

```
INFO  stats: {"categories":0,"categoriesDone":0,"items":50420,"pages":0,"itemsDuplicity":11563}
```

V SK verzi by mělo být

```
INFO  stats: {"categories":0,"categoriesDone":0,"items":47340,"pages":0,"itemsDuplicity":11434}
```

8.4.2022
Proveden test scrapování s použitím proxy RESIDENTIAL

Chyby 502 se prakticky neobjevily, ale stále je zde problém s CredentialsProviderError

Výsledek testu:

INFO stats: {"categories":449,"categoriesDone":820,"items":11624,"pages":1885,"itemsDuplicity":8859}

Nalezeny fragmenty kódu, které pravděpodobně zapisovaly kód i v režimu development - opraveno.


