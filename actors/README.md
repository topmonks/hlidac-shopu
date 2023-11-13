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
Nezřídka ve výpisu kategorie narazíme na stránkování. Chceme projít všechny jednotlivé stránky a proto si nejdříve zjistíme:

* Kolik je celkem stránek?
* Jaký je maximální možný počet produktů na stránku?

Poté sestavíme URL adresy pro každou z nich.

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
Potřebná data bývá možné získat z položek ve výpisu kategorie. Protože se ale produkt 
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
  "inStock": true,
  "currentUnitPrice": 0,
  "useUnitPrice": false,
  "quantity": 0
}
```
