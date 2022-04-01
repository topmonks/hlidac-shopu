# Apify Actory pro Hlídač shopů

Actor pro **každý jeden eshop** pravidelně kontroluje uváděné **slevy a ceny**.
Jeho úkolem je projít veškeré kategorie a získat data pro každý produkt v nich. 

# Postup
Nejprve si na eshopu najdeme stránku, sitemapu nebo endpoint, odkud získáme kompletní 
seznam kategorií. Budou nás zajímat jejich URL adresy a názvy.

### Kategorie
Podrobnější informace o kategorii produktu získáváme tak, že procházíme nejprve nejhlubší kategorie a pokračujeme výš k těm hlavním.

```bash
# Kategorie
├── A #14
│   ├── AA #6
│   │   ├── AA1 #1
│   │   ├── AA2 #2
│   │   └── AA3 #3
│   ├── AB #7
│   └── AC #8
├── B #15
├── C #16
│   ├── CA #9
│   └── CB #10
│       ├── CB1 #4
│       └── CB2 #5
└── D #17
    ├── DA #11
    ├── DB #12
    └── DC #13
```

#### Stránkování
Nezřídka ve výpisu kategorie narazíme na stránkování. Chceme projít všechny jednotlivé stránky  
a proto si nejdříve zjistíme:

* Kolik je celkem stránek?
* Jaký je maximální možný počet produktů na stránku?

A poté sestavíme URL adresy pro každou z nich.

```js
const categoryUrl = "https://eshop.example.com/some-categoty/";
const itemsPerPage = 100;

const requests = [];

for (let i = 1; i <= pagesTotal; i++) {
  requests.push(`${categoryUrl}?page=${i}&limit=${itemsPerPage}`);
}
```

### Produkty
Ve většině případů není nutné procházet jednotlivé detaily produktů. 
Potřebná data bývá možné získat z položek ve výpisy kategorie. Protože se ale produkt 
může nacházet ve více než jedné kategorii, je potřeba ukládat pouze jeho první výskyt.

```js
  const products = new Set();

  for (let $item of $items) {
    const data = extractProductData($item);
    if (products.has(data.itemId)) {
      continue;
    }
    products.set(data.itemId, data);
  }
```
#### Data produktu
```json
{
  "itemId": "",
  "itemUrl": "",
  "itemName": "",
  "img": "",
  "discounted": false,
  "originalPrice": 0,
  "currency": "",
  "currentPrice": 0,
  "category": "",
  "inStock": true
}
```

### Apify Actor
Kostru nového actoru vygenerujete pomocí `scripts/new-actor.mjs nazev-shopu`.

```bash
actors/nazev-shopu
├── Dockerfile
├── README.md # 👈 zde si popište specifika daného shopu
├── apify.json
├── apify_storage
├── main.js # 🥩
└── package.json
```
#### `main.js`
Jeden eshop → jeden actor → jeden soubor.
Společnou funkcionalitu importujeme z balíčku `@hlidac-shopu/actors-common`.

```js
import { S3Client } from "@aws-sdk/client-s3";
import { CloudFrontClient } from "@aws-sdk/client-cloudfront";
import { uploadToKeboola } from "@hlidac-shopu/actors-common/keboola.js";
import { invalidateCDN } from "@hlidac-shopu/actors-common/product.js";
import rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { withPersistedStats } from "@hlidac-shopu/actors-common/stats.js";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Apify from "apify";
import { gotScraping } from "got-scraping";
import { shopName, shopOrigin } from "@hlidac-shopu/lib/shops.mjs";
import { defAtom } from "@thi.ng/atom";

const { log } = Apify.utils;

// 👀 Jednotlivé kroky crawlování
const LABELS = {
  START: "START",
  CATEGORY: "CATEGORY"
};

const ROOT_URL = "https://eshop.example.com";

Apify.main(async () => {
  rollbar.init();

  const s3 = new S3Client({ region: "eu-central-1" });
  const cloudfront = new CloudFrontClient({ region: "eu-central-1" });

  const stats = await withPersistedStats(x => x, {
    categories: 0,
    items: 0,
    itemsUnique: 0,
    itemsDuplicity: 0
  });
  const processedIds = new Set();

  const input = await Apify.getInput();
  const {
    debug = false,
    type = ActorType.FULL // 👀 mód ve kterém je actor spuštěn
  } = input ?? {};

  if (debug) {
    Apify.utils.log.setLevel(Apify.utils.log.LEVELS.DEBUG);
  }

  /** @type {RequestQueue} */
  const requestQueue = await Apify.openRequestQueue();
  
  if (type === ActorType.FULL) {
    await requestQueue.addRequest({
      url: ROOT_URL,
      userData: {
        label: LABELS.START
      }
    });
  } else if (type === ActorType.TEST) {
    // implement test run here
  }
    

  const crawler = new Apify.BasicCrawler({
    requestQueue,
    maxConcurrency: 10,
    maxRequestRetries: 1,
    async handleRequestFunction({ request }) {
      const {
        url,
        userData: { label, category }
      } = request;

      const { statusCode, body } = await gotScraping({
        responseType: "json",
        url
      });

      if (statusCode !== 200) {
        return log.info(body.toString());
      }

      switch (label) {
        case LABELS.START:
          return handleStart({ type }); // 👈 implement me
        case LABELS.CATEGORY:
          return handleCategory({ type, category }); // 👈 implement me
        default:
          throw new Error("Unknown actor type");
      }
    }
    async handleFailedRequestFunction() {
      log.error(`Request ${request.url} failed multiple times`, request);
    }
  });

  await crawler.run();
  log.info("crawler finished");

  await Promise.allSettled([
    stats.save(),
    invalidateCDN(cloudfront, "EQYSHWUECAQC9", shopOrigin(detailUrl.deref())),
    uploadToKeboola(shopName(detailUrl.deref()))
  ]);

  log.info("invalidated Data CDN");
  log.info("Finished.");
```
