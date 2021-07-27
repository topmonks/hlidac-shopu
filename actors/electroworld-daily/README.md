# electroworld.cz actor

## Actors INPUT
<sup>~ apify_storage/key_value_stores/default/INPUT.json</sup>

```json
{
  "development": false,
  "debug": false,
  "maxRequestRetries": 3,
  "maxConcurrency": 10,
  "type": "FULL"
}
```
```text
"type": "FULL" || "DETAIL" || "COUNT" || "TEST_FULL"
```
## Actors daily item example OUTPUT
```json
{
  "itemId": "323939",
  "img": "https://cdn.electroworld.cz/images/img-250/5/1381025.jpg",
  "itemUrl": "https://www.electroworld.cz/samsung-galaxy-a32-128-gb-cerny",
  "itemName": "Samsung Galaxy A32 128 GB černý",
  "currentPrice": null,
  "originalPrice": 5990,
  "sale": null,
  "rating": "1",
  "discounted": true,
  "category": [
    "SMART HOME, chytrá domácnost"
  ],
  "currency": "CZK",
  "inStock": true
}
```

## Actors detail item example OUTPUT
```json
{
  "@context": "http://schema.org",
  "@type": "itemPage",
  "identifier": "194252056035",
  "url": "https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy",
  "breadcrumbs": {
    "@context": "http://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      "Mobily, notebooky, tablety, PC, gaming",
      "Notebooky aundefinedpočítače",
      "Notebooky",
      "Apple MacBooky",
      "MacBook Air",
      "MacBook Air M1 2020",
      "MacBook Air M1 2020  Apple"
    ]
  },
  "mainEntity": {
    "@context": "http://schema.org",
    "@type": "Product",
    "name": "Apple MacBook Air 13\" M1 256 GB (2020) MGN63CZ/A vesmírně šedý",
    "description": "Elegantní MacBook Air M1 (2020) ve vesmírně šedém provedení pohání čip Apple M1 složený z 8-jádrového CPU procesoru, 7-jádrového GPU procesoru a 16-jádrového Neural Engine. Tomu asistuje 8 GB operační paměť RAM. Vaše data si uložíte na SSD disk s kapacitou 256 GB. Zobrazení obsahu zabezpečí 13,3-palcový Retina IPS displej s technologií True Tone, rozlišením 2560×1600 pixelů při 227 PPI a jasem 400 nitů. Ve výbavě najdete FaceTime HD kameru, stereo reproduktory s podporou Dolby Atmos, podsvícenou klávesnici Magic Keyboard, Force Touch trackpad, 2× port USB-C (Thunderbolt 3) i bezdrátové připojení Bluetooth a Wi-Fi. Uživatelské prostředí poskytne operační systém Mac OS Big Sur.",
    "images": [
      "https://cdn.electroworld.cz/images/img-1000/5/1313935.jpg",
      "https://cdn.electroworld.cz/images/img-1000/7/1313937.jpg",
      "https://cdn.electroworld.cz/images/img-1000/1/1314391.jpg",
      "https://cdn.electroworld.cz/images/img-1000/9/1314389.jpg"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": 1,
      "ratingCount": "4"
    },
    "offers": {
      "@type": "Offer",
      "priceCurrency": "CZK",
      "url": "https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy",
      "itemCondition": "http://schema.org/NewCondition",
      "availability": "http://schema.org/InStock"
    },
    "brand": "Apple",
    "sku": "MGN63CZ/A",
    "mpn": null,
    "gtin13": "194252056035",
    "category": "Mobily, notebooky, tablety, PC, gaming | Notebooky a počítače | Notebooky | Apple MacBooky | MacBook Air | MacBook Air M1 2020",
    "additionalProperty": [
      {
        "@type": "PropertyValue",
        "name": "Úhlopříčka",
        "value": "13,3 \""
      },
      {
        "@type": "PropertyValue",
        "name": "Název procesoru",
        "value": "Apple M1"
      },
      {
        "@type": "PropertyValue",
        "name": " Značka:",
        "value": "Apple"
      },
      {
        "@type": "PropertyValue",
        "name": "? Wi-Fi:",
        "value": "Ano"
      },
      {
        "@type": "PropertyValue",
        "name": "? Bluetooth:",
        "value": "Ano"
      },
      {
        "@type": "PropertyValue",
        "name": " Wi-Fi standardy:",
        "value": "802.11ax (WiFi 6)"
      },
      {
        "@type": "PropertyValue",
        "name": " Barva:",
        "value": "šedá"
      },
      {
        "@type": "PropertyValue",
        "name": " Šírka:",
        "value": "21,24 mm"
      },
      {
        "@type": "PropertyValue",
        "name": " Výška:",
        "value": "16,1 mm"
      },
      {
        "@type": "PropertyValue",
        "name": " Délka:",
        "value": "304,1 mm"
      },
      {
        "@type": "PropertyValue",
        "name": " Hmotnost:",
        "value": "1,29 Kg"
      },
      {
        "@type": "PropertyValue",
        "name": "? Integr. čtečka karet:",
        "value": "Ne"
      },
      {
        "@type": "PropertyValue",
        "name": " Snímač otisků prstů:",
        "value": "Ano"
      },
      {
        "@type": "PropertyValue",
        "name": " Podsvícená klávesnice:",
        "value": "Ano"
      },
      {
        "@type": "PropertyValue",
        "name": " Numerická klávesnice:",
        "value": "Ne"
      },
      {
        "@type": "PropertyValue",
        "name": " Typ procesoru:",
        "value": "Apple M1"
      },
      {
        "@type": "PropertyValue",
        "name": " Verze procesoru:",
        "value": "M1"
      },
      {
        "@type": "PropertyValue",
        "name": "? Počet jader procesoru:",
        "value": "8"
      },
      {
        "@type": "PropertyValue",
        "name": " Název procesoru:",
        "value": "Apple M1"
      },
      {
        "@type": "PropertyValue",
        "name": "? Poskytovaný OS:",
        "value": "Mac OS"
      },
      {
        "@type": "PropertyValue",
        "name": " Dotyková obrazovka:",
        "value": "Ne"
      },
      {
        "@type": "PropertyValue",
        "name": "? Rozlišení displeje (px):",
        "value": "2560x1600"
      },
      {
        "@type": "PropertyValue",
        "name": "? Zobraz.frekvence obraz. (HZ):",
        "value": "60"
      },
      {
        "@type": "PropertyValue",
        "name": " Zobrazovací technologie:",
        "value": "IPS"
      },
      {
        "@type": "PropertyValue",
        "name": " Povrch displeje:",
        "value": "lesklý"
      },
      {
        "@type": "PropertyValue",
        "name": " Úhlopříčka:",
        "value": "13,3 \""
      },
      {
        "@type": "PropertyValue",
        "name": " Rozlišení displeje:",
        "value": "QHD"
      },
      {
        "@type": "PropertyValue",
        "name": "? Operační paměť RAM:",
        "value": "8 GB"
      },
      {
        "@type": "PropertyValue",
        "name": " Kapacita SSD:",
        "value": "256 GB"
      },
      {
        "@type": "PropertyValue",
        "name": " Kapacita disku:",
        "value": "256 GB"
      },
      {
        "@type": "PropertyValue",
        "name": " Typ disku:",
        "value": "SSD"
      },
      {
        "@type": "PropertyValue",
        "name": "Kód produktu:",
        "value": "MGN63CZ/A"
      }
    ],
    "mainContentOfPage": [
      {
        "@type": "WebPageElement",
        "cssSelector": "#snippet--pdbox",
        "encodingFormat": "text/html",
        "encoding": "\n\n<script type=\"application/ld+json\" id=\"snippet-productRichSnippet-richSnippet\">\n\t{\"brand\":{\"@type\":\"Thing\",\"name\":\"Apple\"},\"sku\":\"MGN63CZ\\/A\",\"offers\":{\"url\":\"https:\\/\\/www.electroworld.cz\\/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy\",\"@type\":\"Offer\",\"availability\":\"http:\\/\\/schema.org\\/InStock\",\"price\":27889,\"priceCurrency\":\"CZK\",\"image\":\"https:\\/\\/cdn.electroworld.cz\\/images\\/img-large\\/5\\/1313935.jpg\",\"category\":\"Mobily, notebooky, tablety, PC, gaming | Notebooky a počítače | Notebooky | Apple MacBooky | MacBook Air | MacBook Air M1 2020\"},\"gtin13\":\"194252056035\",\"review\":[{\"@type\":\"review\",\"datePublished\":\"2021-03-31\",\"description\":\"Po zvyknutí na jiný systém (celý život na Windows) to bude solidní zařízení.\",\"author\":\"Martin\",\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"worstRating\":0,\"bestRating\":5}},{\"@type\":\"review\",\"datePublished\":\"2021-03-29\",\"description\":\"Po dlouhé době Apple opět dokázal, že umí dát na trh konkurenci převyšující produkt... \",\"author\":\"Filip\",\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"worstRating\":0,\"bestRating\":5}},{\"@type\":\"review\",\"datePublished\":\"2021-01-28\",\"description\":null,\"author\":\"Tomáš\",\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"worstRating\":0,\"bestRating\":5}},{\"@type\":\"review\",\"datePublished\":\"2020-11-20\",\"description\":null,\"author\":\"David\",\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"worstRating\":0,\"bestRating\":5}},{\"@type\":\"Review\",\"reviewBody\":\"Po zvyknutí na jiný systém (celý život na Windows) to bude solidní zařízení.\",\"datePublished\":\"2021-03-31\",\"author\":{\"@type\":\"Person\",\"name\":\"Martin\"},\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"bestRating\":5,\"worstRating\":0}},{\"@type\":\"Review\",\"reviewBody\":\"Po dlouhé době Apple opět dokázal, že umí dát na trh konkurenci převyšující produkt... \",\"datePublished\":\"2021-03-29\",\"author\":{\"@type\":\"Person\",\"name\":\"Filip\"},\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"bestRating\":5,\"worstRating\":0}},{\"@type\":\"Review\",\"reviewBody\":null,\"datePublished\":\"2021-01-28\",\"author\":{\"@type\":\"Person\",\"name\":\"Tomáš\"},\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"bestRating\":5,\"worstRating\":0}},{\"@type\":\"Review\",\"reviewBody\":null,\"datePublished\":\"2020-11-20\",\"author\":{\"@type\":\"Person\",\"name\":\"David\"},\"reviewRating\":{\"@type\":\"Rating\",\"ratingValue\":5,\"bestRating\":5,\"worstRating\":0}}],\"@context\":\"http:\\/\\/schema.org\",\"@type\":\"Product\",\"name\":\"Apple MacBook Air 13\\\" M1 256 GB (2020) MGN63CZ\\/A vesmírně šedý\",\"description\":\"Elegantní MacBook Air M1 (2020) ve vesmírně šedém provedení pohání čip Apple M1 složený z 8-jádrového CPU procesoru, 7-jádrového GPU procesoru a 16-jádrového Neural Engine. Tomu asistuje 8 GB operační paměť RAM. Vaše data si uložíte na SSD disk s kapacitou 256 GB. Zobrazení obsahu zabezpečí 13,3-palcový Retina IPS displej s technologií True Tone, rozlišením 2560×1600 pixelů při 227 PPI a jasem 400 nitů. Ve výbavě najdete FaceTime HD kameru, stereo reproduktory s podporou Dolby Atmos, podsvícenou klávesnici Magic Keyboard, Force Touch trackpad, 2× port USB-C (Thunderbolt 3) i bezdrátové připojení Bluetooth a Wi-Fi. Uživatelské prostředí poskytne operační systém Mac OS Big Sur.\",\"image\":\"https:\\/\\/cdn.electroworld.cz\\/images\\/img-large\\/5\\/1313935.jpg\",\"identifier\":\"194252056035\",\"url\":\"https:\\/\\/www.electroworld.cz\\/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy\",\"aggregateRating\":{\"@type\":\"AggregateRating\",\"ratingValue\":\"5.0\",\"reviewCount\":4,\"ratingCount\":4,\"bestRating\":5,\"worstRating\":0}}\n</script>\n\n\t\t<div class=\"product-top ajax-wrap\" id=\"produkt\">\n\n<div id=\"snippet-flashMessage-flashMessage\"></div>\n<header class=\"product-top__header\">\n\t<h1 class=\"product-top__title\">Apple MacBook Air 13&quot; M1 256 GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD; </h1>\n\n\t\t<ul class=\"product-top__promo product-promo ul--reset\">\n\t\t\t\n\t<li>\n\t\t<a href=\"/3-mesice-navic-k-rocni-licenci-na-microsoft-365\" class=\"product-top__promo-item product-promo__item complex-link complex-link--hover-underline\">\n\t\t\t<span class=\"product-promo__tag\">akce</span>\n\t\t\t<span class=\"product-promo__desc\">\n\t\t\t\t<span class=\"complex-link__underline\">Zakupte spole&#x10D;n&#x11B; s Microsoft 365 a z&#xED;sk&#xE1;te 3 m&#x11B;s&#xED;&#x10D;n&#xED; licenci nav&#xED;c</span>\n\n\t\t\t</span>\n\t\t</a>\n\t</li>\n\n\t\t</ul>\n\n\n\t<ul class=\"product-top__actions ul--reset\">\n\t\t<li class=\"product-top__rating\">\n\t\t\t<span class=\"product-top__rating-stars rating-stars\">\n\t\t\t\t\n\t<span class=\"rating-stars__percents\">100%</span>\n\t<span class=\"rating-stars__bar\" aria-hidden=\"true\">\n\t\t<i class=\"rating-stars__icon icon icon--star\">\n\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t</svg>\n\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t</svg>\n\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t</svg>\n\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t</svg>\n\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t</svg>\n\t\t</i>\n\t\t<span class=\"rating-stars__bar rating-stars__bar--value\" style=\"width:100%;\">\n\t\t\t<i class=\"rating-stars__icon icon icon--star\">\n\t\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t\t</svg>\n\t\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t\t</svg>\n\t\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t\t</svg>\n\t\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t\t</svg>\n\t\t\t</i><i class=\"rating-stars__icon icon icon--star\">\n\t\t\t\t<svg viewbox=\"0 0 12 12\">\n\t\t\t\t\t<use xlink:href=\"#star\"/>\n\t\t\t\t</svg>\n\t\t\t</i>\n\t\t</span>\n\t</span>\n\n\t\t\t</span>\n\t\t\t\t4&#xD7;\n\t\t</li>\n<li class=\"ajax-wrap product-top__compare\" id=\"snippet-productDetailCompare-productDetailCompare\">\n\t\n\t\t<a class=\"product-top__action ajax\" data-ajax-pd=\"compareAdd\" rel=\"nofollow\" href=\"/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy?do=productDetailCompare-addToCompare\">\n\t\t\t<i class=\"product-top__action-icon product-top__icon-compare icon icon--compare\" aria-hidden=\"true\">\n\t\t\t\t<svg viewbox=\"0 0 31 31\">\n\t\t\t\t\t<use xlink:href=\"#compare\"/>\n\t\t\t\t</svg>\n\t\t\t</i>\n\t\t\t<span class=\"product-top__action-name\">Porovnat</span>\n\t\t</a>\n</li>\n\t\t<li>\n\n\t\t\t<a href=\"/prihlasit-se?login-backlink=%2Foblibene-produkty-pridani-produktu%3Fproduct%3D310721&amp;type=wishlist\" class=\"product-top__action ajax js-pdbox\" data-ajax-off=\"history\" data-pdbox-width=\"1100\" data-pdbox-class-name=\"pdbox--dark\">\n\t\t\t\t<i class=\"product-top__action-icon product-top__icon-heart icon icon--heart\" aria-hidden=\"true\">\n\t\t\t\t\t<svg viewbox=\"0 0 30 27\">\n\t\t\t\t\t\t<use xlink:href=\"#heart\"/>\n\t\t\t\t\t</svg>\n\t\t\t\t</i>\n\t\t\t\t<span class=\"product-top__action-name\">Obl&#xED;bit</span>\n\t\t\t</a>\n\t\t</li>\n\t\t<li>\n\t\t\t<a href=\"/hlidaci-pes-pridani-produktu?product=310721\" class=\"product-top__action ajax js-pdbox\" data-pdbox-width=\"1100\" data-pdbox-class-name=\"pdbox--dark\">\n\t\t\t\t<i class=\"product-top__action-icon product-top__icon-eye icon icon--eye\" aria-hidden=\"true\">\n\t\t\t\t\t<svg viewbox=\"0 0 30 19\">\n\t\t\t\t\t\t<use xlink:href=\"#eye\"/>\n\t\t\t\t\t</svg>\n\t\t\t\t</i>\n\t\t\t\t<span class=\"product-top__action-name\">Hl&#xED;dat cenu a dostupnost</span>\n\t\t\t</a>\n\t\t</li>\n\t</ul>\n\n\n</header>\n\n<div id=\"product-images\" class=\"product-top__images\">\n\n\n\n\n\n\t\t\t\n\t\t\t\n\n\t\t\t\t<p id=\"product-main-img\" class=\"product-top__main-image-wrap\" data-itemid=\"310721\">\n\t\t\t\t\t<a href=\"https://cdn.electroworld.cz/images/img-1000/5/1313935.jpg\" class=\"product-top__main-image-link img-box\">\n \n\n\n\n\n\n<img src=\"data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==\" data-src=\"https://cdn.electroworld.cz/images/img-500/5/1313935.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-500/5/1313935.jpg, https://cdn.electroworld.cz/images/img-1000/5/1313935.jpg 1.2x\" alt=\"Apple MacBook Air 13&quot; M1 256GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img js-lazy js-only jsOnly product-top__main-image compare-img\">\n\n<noscript>\n\t<img src=\"https://cdn.electroworld.cz/images/img-500/5/1313935.jpg\" srcset=\"https://cdn.electroworld.cz/images/img-500/5/1313935.jpg, https://cdn.electroworld.cz/images/img-1000/5/1313935.jpg 1.2x\" alt=\"Apple MacBook Air 13&quot; M1 256GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img product-top__main-image compare-img\">\n</noscript>\n\t\t\t\t\t</a>\n\t\t\t\t</p>\n\t\t\t\t\t<ul class=\"product-top__other-images other-images ul--reset\" id=\"product-other-imgs\">\n\t\t\t\t\t\t\n\n\n\n\t\t\t\t<li class=\"other-images__item other-images__item--image other-images__item--active\">\n\t\t\t\t\t<a href=\"https://cdn.electroworld.cz/images/img-1000/5/1313935.jpg\" class=\"other-images__link img-box js-pdbox\" data-rel=\"productImage\" data-id=\"1313935\" data-src=\"https://cdn.electroworld.cz/images/img-500/5/1313935.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-500/5/1313935.jpg, https://cdn.electroworld.cz/images/img-1000/5/1313935.jpg 2x\" data-pdbox-thumbnail=\"https://cdn.electroworld.cz/images/img-1000/5/1313935.jpg\">\n\t\t\t\t\t\t<span class=\"other-images__link-wrap\">\n\t\t\t\t\t\t\t \n\n\n\n\n\n<img src=\"data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==\" data-src=\"https://cdn.electroworld.cz/images/img-125/5/1313935.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-125/5/1313935.jpg, https://cdn.electroworld.cz/images/img-250/5/1313935.jpg 2x\" alt=\"Apple MacBook Air 13&quot; M1 256GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img js-lazy js-only jsOnly\">\n\n<noscript>\n\t<img src=\"https://cdn.electroworld.cz/images/img-125/5/1313935.jpg\" srcset=\"https://cdn.electroworld.cz/images/img-125/5/1313935.jpg, https://cdn.electroworld.cz/images/img-250/5/1313935.jpg 2x\" alt=\"Apple MacBook Air 13&quot; M1 256GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img\">\n</noscript>\n\n\t\t\t\t\t\t</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\n\n\n\t\t\t\n\t\t\t\n\n\n\n\n\t\t\t\t<li class=\"other-images__item other-images__item--image\">\n\t\t\t\t\t<a href=\"https://cdn.electroworld.cz/images/img-1000/7/1313937.jpg\" class=\"other-images__link img-box js-pdbox\" data-rel=\"productImage\" data-id=\"1313937\" data-src=\"https://cdn.electroworld.cz/images/img-500/7/1313937.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-500/7/1313937.jpg, https://cdn.electroworld.cz/images/img-1000/7/1313937.jpg 2x\" data-pdbox-thumbnail=\"https://cdn.electroworld.cz/images/img-1000/7/1313937.jpg\">\n\t\t\t\t\t\t<span class=\"other-images__link-wrap\">\n\t\t\t\t\t\t\t \n\n\n\n\n\n<img src=\"data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==\" data-src=\"https://cdn.electroworld.cz/images/img-125/7/1313937.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-125/7/1313937.jpg, https://cdn.electroworld.cz/images/img-250/7/1313937.jpg 2x\" alt=\"Apple MacBook Air 13&quot; M1 256GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img js-lazy js-only jsOnly\">\n\n<noscript>\n\t<img src=\"https://cdn.electroworld.cz/images/img-125/7/1313937.jpg\" srcset=\"https://cdn.electroworld.cz/images/img-125/7/1313937.jpg, https://cdn.electroworld.cz/images/img-250/7/1313937.jpg 2x\" alt=\"Apple MacBook Air 13&quot; M1 256GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img\">\n</noscript>\n\n\t\t\t\t\t\t</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\n\n\n\t\t\t\n\t\t\t\n\n\n\n\n\t\t\t\t<li class=\"other-images__item other-images__item--image\">\n\t\t\t\t\t<a href=\"https://cdn.electroworld.cz/images/img-1000/1/1314391.jpg\" class=\"other-images__link img-box js-pdbox\" data-rel=\"productImage\" data-id=\"1314391\" data-src=\"https://cdn.electroworld.cz/images/img-500/1/1314391.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-500/1/1314391.jpg, https://cdn.electroworld.cz/images/img-1000/1/1314391.jpg 2x\" data-pdbox-thumbnail=\"https://cdn.electroworld.cz/images/img-1000/1/1314391.jpg\">\n\t\t\t\t\t\t<span class=\"other-images__link-wrap\">\n\t\t\t\t\t\t\t \n\n\n\n\n\n<img src=\"data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==\" data-src=\"https://cdn.electroworld.cz/images/img-125/1/1314391.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-125/1/1314391.jpg, https://cdn.electroworld.cz/images/img-250/1/1314391.jpg 2x\" alt=\"Apple MacBook Air 13&quot; M1 256 GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img js-lazy js-only jsOnly\">\n\n<noscript>\n\t<img src=\"https://cdn.electroworld.cz/images/img-125/1/1314391.jpg\" srcset=\"https://cdn.electroworld.cz/images/img-125/1/1314391.jpg, https://cdn.electroworld.cz/images/img-250/1/1314391.jpg 2x\" alt=\"Apple MacBook Air 13&quot; M1 256 GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;\" class=\"img-box__img\">\n</noscript>\n\n\t\t\t\t\t\t</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\n\n\n\t\t\t\n\t\t\t\n\n\n\n\n\t\t\t\t<li class=\"other-images__item other-images__item--more\">\n\t\t\t\t\t<a href=\"https://cdn.electroworld.cz/images/img-1000/9/1314389.jpg\" class=\"other-images__link other-images__link--more js-other-images-excluded js-pdbox\" data-rel=\"productImage\" data-pdbox-thumbnail=\"https://cdn.electroworld.cz/images/img-1000/9/1314389.jpg\">\n\t\t\t\t\t\t<span>Dal&#x161;&#xED; fotky</span> <strong>1</strong>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\n\n\t\t\t\t\t\t\t\t<li class=\"other-images__item other-images__item--logo\">\n\t\t\t\t\n\t\t\t\t<a href=\"/apple\" class=\"other-images__link js-other-images-excluded other-images__link--logo img-box\">\n\t\t\t\t\t<span class=\"other-images__link-wrap\">\n \n\n\n\n\n\n<img src=\"data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==\" data-src=\"https://cdn.electroworld.cz/images/img-125/0/275220.jpg\" data-srcset=\"https://cdn.electroworld.cz/images/img-125/0/275220.jpg, https://cdn.electroworld.cz/images/img-250/0/275220.jpg 2x\" alt=\"Apple\" class=\"img-box__img js-lazy js-only jsOnly\">\n\n<noscript>\n\t<img src=\"https://cdn.electroworld.cz/images/img-125/0/275220.jpg\" srcset=\"https://cdn.electroworld.cz/images/img-125/0/275220.jpg, https://cdn.electroworld.cz/images/img-250/0/275220.jpg 2x\" alt=\"Apple\" class=\"img-box__img\">\n</noscript>\n\t\t\t\t\t</span>\n\t\t\t\t</a>\n\t\t\t</li>\n\n\n\t\t\t\t\t<li class=\"other-images__item other-images__item--hover\" aria-hidden=\"true\"></li>\n\t\t\t\t</ul>\n\n\n\n\n</div>\n\n<div class=\"product-top__info\">\n\t<form action=\"/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy\" method=\"post\" id=\"frm-productVariants-filter\" class=\"ajax-wrap js-product-variants\">\n\t\t\t<h3 class=\"js-hide\">Vyberte si jinou variantu</h3>\n\n\t\t\t<div class=\"product-top__variants variants-filter ajax-wrap js-only\">\n\t\t\t\t\t\t<p class=\"variants-filter__item\">\n\t\t\t\t\t\t\t<label class=\"variants-filter__label\" for=\"frm-productVariants-filter-parameters-44336\">Barva</label>\n\t\t\t\t\t\t\t<select class=\"inp-text inp-text--rounded inp-text--l js-select-change-submit\" name=\"parameters[44336]\" id=\"frm-productVariants-filter-parameters-44336\"><option value=\"seda-11\" data-items=\"[310683,310721]\" selected>&#x161;ed&#xE1;</option><option value=\"stribrna-11\" data-items=\"[310687,310691]\">st&#x159;&#xED;brn&#xE1;</option><option value=\"zlata-1\" data-items=\"[310695,310699]\">zlat&#xE1;</option></select>\n\t\t\t\t\t\t</p>\n\t\t\t\t\t\t<p class=\"variants-filter__item\">\n\t\t\t\t\t\t\t<label class=\"variants-filter__label\" for=\"frm-productVariants-filter-parameters-44998\">Kapacita SSD</label>\n\t\t\t\t\t\t\t<select class=\"inp-text inp-text--rounded inp-text--l js-select-change-submit\" name=\"parameters[44998]\" id=\"frm-productVariants-filter-parameters-44998\"><option value=\"512\" data-items=\"[310683,310691,310699]\">512 GB</option><option value=\"256\" data-items=\"[310687,310695,310721]\" selected>256 GB</option></select>\n\t\t\t\t\t\t</p>\n\t\t\t</div>\n\n\t\t<ul class=\"variants-filter__list js-hide\">\n\t\t\t\t<li>\n\t\t\t\t\t<a href=\"https://www.electroworld.cz/apple-macbook-air-13-m1-512gb-2020-mgn73cz-a-vesmirne-sedy\">\n\t\t\t\t\t\t<span value=\"310683\" data-url=\"https://www.electroworld.cz/apple-macbook-air-13-m1-512gb-2020-mgn73cz-a-vesmirne-sedy\">Apple MacBook Air 13&quot; M1 512 GB (2020) MGN73CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\t\t\t\t<li>\n\t\t\t\t\t<a href=\"https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn93cz-a-stribrny\">\n\t\t\t\t\t\t<span value=\"310687\" data-url=\"https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn93cz-a-stribrny\">Apple MacBook Air 13&quot; M1 256 GB (2020) MGN93CZ/A st&#x159;&#xED;brn&#xFD;</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\t\t\t\t<li>\n\t\t\t\t\t<a href=\"https://www.electroworld.cz/apple-macbook-air-13-m1-512gb-2020-mgna3cz-a-stribrny\">\n\t\t\t\t\t\t<span value=\"310691\" data-url=\"https://www.electroworld.cz/apple-macbook-air-13-m1-512gb-2020-mgna3cz-a-stribrny\">Apple MacBook Air 13&quot; M1 512 GB (2020) MGNA3CZ/A st&#x159;&#xED;brn&#xFD;</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\t\t\t\t<li>\n\t\t\t\t\t<a href=\"https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgnd3cz-a-zlaty\">\n\t\t\t\t\t\t<span value=\"310695\" data-url=\"https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgnd3cz-a-zlaty\">Apple MacBook Air 13&quot; M1 256 GB (2020) MGND3CZ/A zlat&#xFD;</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\t\t\t\t<li>\n\t\t\t\t\t<a href=\"https://www.electroworld.cz/apple-macbook-air-13-m1-512gb-2020-mgne3cz-a-zlaty\">\n\t\t\t\t\t\t<span value=\"310699\" data-url=\"https://www.electroworld.cz/apple-macbook-air-13-m1-512gb-2020-mgne3cz-a-zlaty\">Apple MacBook Air 13&quot; M1 512GB (2020) MGNE3CZ/A zlat&#xFD;</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\t\t\t\t<li>\n\t\t\t\t\t<a href=\"https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy\">\n\t\t\t\t\t\t<span value=\"310721\" data-url=\"https://www.electroworld.cz/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy\">Apple MacBook Air 13&quot; M1 256 GB (2020) MGN63CZ/A vesm&#xED;rn&#x11B; &#x161;ed&#xFD;</span>\n\t\t\t\t\t</a>\n\t\t\t\t</li>\n\t\t</ul>\n\t<input type=\"hidden\" name=\"_do\" value=\"productVariants-filter-submit\"><!--[if IE]><input type=IEbug disabled style=\"display:none\"><![endif]-->\n</form>\n\n\n<div id=\"snippet-fullBuyBox-productInfo-flashMessage-flashMessage\"></div><form class=\"ajax\" action=\"/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy\" method=\"post\" id=\"frm-fullBuyBox-productInfo-buyBoxForm\">\n\t\n\t\t\t\n\n\t\t\n\n\t\t\n\n\n\n\n\n\n\t\n\t\n\n\n\n\t\t<div class=\"product-top__prices product-top__prices--only-price\">\n\t\t\t<p class=\"product-top__price\">\n\t\t\t\t\t\t<del>29&#xA0;989&#xA0;K&#x10D;</del> <a class=\"tooltip-info js-tooltip\" data-tooltip-description data-tooltip-title=\"Doporu&#x10D;en&#xE1; cena v&#xFD;robcem\">?</a>\n\t\t\t\t\t\t<span class=\"product-top__price-note\">U&#x161;et&#x159;&#xED;te 7 %</span>\n\t\t\t\t\t<strong>27&#xA0;889&#xA0;K&#x10D;</strong>\n\t\t\t</p>\n\n\t\t\t\n\n\t\t\t\n\n\t\t\t\t\t\t\t<p class=\"product-top__price--installments product-top__price\">\n<a id=\"show-homecredit-calculator-productInfo\" class=\"product-top__installments-link complex-link\" rel=\"nofollow\" data-product-set-code=\"HCONL1072\" data-price=\"2788900\" data-base-url=\"https://api.homecredit.cz/public/v1/calculator/\" data-product-item-id=\"281721\" data-api-key=\"7nx2RXp4x3WyaQHqG9L5\" data-fixed-downpayment=\"true\" href=\"/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy?do=fullBuyBox-productInfo-homeCreditCalculatorButton-submitCalculator\">\n\t\t<i class=\"product-top__installments-icon\" aria-hidden=\"true\"></i>\n\t\t<span class=\"product-top__installments-underline product-top__installments-underline--1 complex-link__underline\">\n\t\t\tNa spl&#xE1;tky\n\t\t</span>\n\t\t<span class=\"product-top__installments-underline product-top__installments-underline--2 complex-link__underline\">\n\t\t\tspo&#x10D;&#xED;tat\n\t\t</span>\n</a>\n\t\t\t</p>\n\n\t\t</div>\n\n\n\t\t\t<div class=\"product-top__cta product-cta\">\n\n\t\t\t\t<div class=\"product-cta__group\">\n\t\t\t\t\t<p class=\"product-cta__availability\">\n\t\t\t\t\t\t<a href=\"/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy/vyber-prodejny-pro-rezervaci\" data-pdbox-width=\"900\" data-pdbox-class-name=\"pdbox--no-padding\" rel=\"nofollow\" class=\"ajax js-pdbox availability--available\">\n\t\t\t\t\t\t\t<span class=\"availability--available\">IHNED v 40 prodejn&#xE1;ch</span>\n\t\t\t\t\t\t</a>\n\t\t\t\t\t</p>\n\n\t\t\t\t\t<div class=\"u-hidden\">\n\t\t\t\t\t\t<input type=\"hidden\" name=\"productItem\" value=\"281721\">\n\t\t\t\t\t\t<input type=\"hidden\" name=\"quantity\" id=\"frm-fullBuyBox-productInfo-buyBoxForm-quantity\" data-nette-rules=\"[{&quot;op&quot;:&quot;:filled&quot;,&quot;rules&quot;:[{&quot;op&quot;:&quot;:float&quot;,&quot;msg&quot;:&quot;Zadejte pros&#xED;m platn&#xE9; &#x10D;&#xED;slo.&quot;}],&quot;control&quot;:&quot;quantity&quot;}]\" value=\"1\">\n\t\t\t\t\t</div>\n\n\t\t\t\t\t<p class=\"product-cta__button-wrap\">\n\t\t\t\t\t\t<a href=\"/rezervace-zbozi?item=281721\" class=\"product-cta__button product-cta__reservation btn btn--l btn--xl@w900 ajax js-pdbox\" data-pdbox-class-name=\"pdbox--prebasket pdbox--reservation\" itemscope itemtype=\"http://schema.org/FindAction\" data-pdbox-width=\"700\">\n\t\t\t\t\t\t\t<i class=\"product-cta__icon product-cta__icon--reservation icon icon--warehouse\" aria-hidden=\"true\">\n\t\t\t\t\t\t\t\t<svg viewbox=\"0 0 32 31\">\n\t\t\t\t\t\t\t\t\t<use xlink:href=\"#warehouse\"/>\n\t\t\t\t\t\t\t\t</svg>\n\t\t\t\t\t\t\t</i>\n\t\t\t\t\t\t\t<span class=\"btn__inner\">\n\t\t\t\t\t\t\t\t\t<meta itemprop=\"name\" content=\"reserve\">\n\t\t\t\t\t\t\t\t\tRezervovat v prodejn&#x11B;\n\t\t\t\t\t\t\t</span>\n\t\t\t\t\t\t</a>\n\t\t\t\t\t</p>\n\t\t\t\t</div>\n\n\t\t\t\t<div class=\"product-cta__group\">\n\t\t\t\t\t<p class=\"product-cta__availability\">\n\t\t\t\t\t\t<a href=\"/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy/dostupnost\" data-pdbox-width=\"1085\" data-pdbox-class-name=\"pdbox--no-padding\" rel=\"nofollow\" class=\"ajax js-pdbox availability--available\">\n\t\t\t\t\t\t\tSkladem 2-5 ks\n\t\t\t\t\t\t</a><br>\n\n\t\t\t\t\t\t\t\t<a href=\"/apple-macbook-air-13-m1-256gb-2020-mgn63cz-a-vesmirne-sedy/dostupnost\" class=\"ajax js-pdbox\" data-pdbox-width=\"1085\" data-pdbox-class-name=\"pdbox--no-padding\" rel=\"nofollow\">\n\t\t\t\t\t\t\t\t\tTerm&#xED;ny doru&#x10D;en&#xED;\n\t\t\t\t\t\t\t\t</a>\n\t\t\t\t\t</p>\n\t\t\t\t\t<p class=\"product-cta__button-wrap\">\n\t\t\t\t\t\t\t<button class=\"product-cta__button product-cta__to-basket btn btn--red btn--l btn--xl@w900 ajax js-pdbox\" data-pdbox-width=\"996\" data-pdbox-class-name=\"pdbox--prebasket\" data-ajax-off=\"history\" itemprop=\"offers\" itemscope itemtype=\"http://schema.org/FindAction http://schema.org/Offer\" type=\"submit\" name=\"addToBasket\" data-datalayer-click=\"onProductItem281721AddToBasketClick\" value=\"Vlo&#x17E;it do ko&#x161;&#xED;ku\">\n\t\t\t\t\t\t\t\t<i class=\"product-cta__icon product-cta__icon--basket icon icon--basket\" aria-hidden=\"true\">\n\t\t\t\t\t\t\t\t\t<svg viewbox=\"0 0 30 31\">\n\t\t\t\t\t\t\t\t\t\t<use xlink:href=\"#basket\"/>\n\t\t\t\t\t\t\t\t\t</svg>\n\t\t\t\t\t\t\t\t</i>\n\t\t\t\t\t\t\t\t<span class=\"btn__inner\">\n\t\t\t\t\t\t\t\t\t\t<meta itemprop=\"name\" content=\"buy\">\n\t\t\t\t\t\t\t\t\t\tVlo&#x17E;it do ko&#x161;&#xED;ku\n\t\t\t\t\t\t\t\t</span>\n\t\t\t\t\t\t\t</button>\n\t\t\t\t\t</p>\n\t\t\t\t</div>\n\t\t\t</div>\n\n\t\t\t<div class=\"product-top__loyalty-installments-wrap\">\n\t\t\t\t<p class=\"product-top__loyalty u-d-f u-ai-fs u-m-0\">\n\t\t\t\t\t\n\n\t\t\t\t\t<i class=\"product-top__loyalty-icon icon icon--round-plus\" aria-hidden=\"true\"></i>\n\t\t\t\t\t<span>\n\t\t\t\t\t\t\tN&#xE1;kupem z&#xED;sk&#xE1;te\n\t\t\t\t\t\t 278,89 bod&#x16F; na\n\t\t\t\t\t\t<a href=\"/vyhody-vernostni-karty\" class=\"ajax js-pdbox\" data-pdbox-width=\"900\" data-ajax-off=\"history\">V&#x11B;rnostn&#xED; kartu ElectroWorld</a>\n\t\t\t\t\t</span>\n\t\t\t\t</p>\n\n\t\t\t</div>\n\n\n\n\n<input type=\"hidden\" name=\"_do\" value=\"fullBuyBox-productInfo-buyBoxForm-submit\"></form>\n\n</div>\n\n\t<p class=\"product-top__desc\">\n\t\tElegantn&#xED; MacBook Air M1 (2020) ve vesm&#xED;rn&#x11B; &#x161;ed&#xE9;m proveden&#xED; poh&#xE1;n&#xED; &#x10D;ip Apple M1 slo&#x17E;en&#xFD; z 8-j&#xE1;drov&#xE9;ho CPU procesoru, 7-j&#xE1;drov&#xE9;ho GPU procesoru a 16-j&#xE1;drov&#xE9;ho Neural Engine. Tomu asistuje 8 GB opera&#x10D;n&#xED; pam&#x11B;&#x165; RAM. Va&#x161;e data si ulo&#x17E;&#xED;te na SSD disk s kapacitou 256 GB. Zobrazen&#xED; obsahu zabezpe&#x10D;&#xED; 13,3-palcov&#xFD; Retina IPS displej s technologi&#xED; True Tone, rozli&#x161;en&#xED;m 2560&#xD7;1600 pixel&#x16F; p&#x159;i 227 PPI a jasem 400 nit&#x16F;. Ve v&#xFD;bav&#x11B; najdete FaceTime HD kameru, stereo reproduktory s podporou Dolby Atmos, podsv&#xED;cenou kl&#xE1;vesnici Magic Keyboard, Force Touch trackpad, 2&#xD7; port USB-C (Thunderbolt 3) i bezdr&#xE1;tov&#xE9; p&#x159;ipojen&#xED; Bluetooth a Wi-Fi. U&#x17E;ivatelsk&#xE9; prost&#x159;ed&#xED; poskytne opera&#x10D;n&#xED; syst&#xE9;m Mac OS Big Sur.\n\t\t<a href=\"#popis\" class=\"product-top__desc-link complex-link\">\n\t\t\t<span class=\"complex-link__underline\">Zobrazit cel&#xFD; popis</span>\n\t\t\t<i class=\"icon icon--arr-down\" aria-hidden=\"true\">\n\t\t\t\t<svg viewbox=\"0 0 37 25\">\n\t\t\t\t\t<use xlink:href=\"#arr-down\"/>\n\t\t\t\t</svg>\n\t\t\t</i>\n\t\t</a>\n\t</p>\n\n<div class=\"product-statuses product-top__statuses\">\n\t<div class=\"u-pos-a u-t-0 u-l-0\">\n\t\t<ul class=\"product-statuses__list\">\n\t<li class=\"product-statuses__item product-statuses__item--green\">Doprava zdarma</li>\n\t<li class=\"product-statuses__item product-statuses__item--red\">Sleva 7 %</li>\n\n\n</ul>\n\n\n\n\t</div>\n</div>\n\t\t</div>\n\t"
      }
    ]
  }
}
```
