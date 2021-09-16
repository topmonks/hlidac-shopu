# Extension

Extension shows historical prices for biggest czech e-commerce websites.

## Shop

Object with getInfo and insertChartElement methods.

To create new shop create new shop with those two methods:

`scrape` method selects itemId, image, title, original and current price of the product from the page.
Returns of object with .

`inject` method inserts widget element to the page. Usually it inserts whole chart wrapper with border and info text.
First param is `renderMarkup` function that returns html element, you can add styles to the root element of the wrapper
by passing string to it.

Example:

```javascript
class Alza extends Shop {
  scrape() {
    const elem = document.querySelector("#pricec");
    if (!elem) return;

    const itemId = (document
      .querySelector("#deepLinkUrl")
      .getAttribute("content")
      .match(/\d+$/) || [])[0];
    const title = document
      .querySelector('h1[itemprop="name"]')
      .innerText.trim();

    return { itemId, title };
  }

  inject(renderMarkup) {
    const elem = document.querySelector("#pricec");
    if (!elem) throw new Error("Element to add chart not found");
    const styles =
      "border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;";
    const markup = renderMarkup(styles);
    elem.insertAdjacentElement("afterend", markup);
    return elem;
  }
}
```

Then add new shop to file `manifest.json` under `matches`:

```javascript
"content_scripts": [
  {
  "matches": [
    "https://www.alza.cz/*",
    "https://www.alza.sk/*"
  ],
    "js": [
      "content.js"
    ],
    "run_at": "document_idle"
  }
]
```

and run command

```
yarn build:extension
```
