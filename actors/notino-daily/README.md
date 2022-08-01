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


