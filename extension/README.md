# Extension

Extension shows historical prices for biggest czech e-commerce websites.

## Shop

Object with getInfo and insertChartElement methods.

To create new shop create new shop with those two methods:

`getInfo` method selects itemId and title of the product from the page. Returns object `{ itemId, title }`.

`insertChartElement` method inserts chart element to the page. Element can be simple div with id `hlidacShopu-chart`. Usually it inserts whole chart wrapper with border and info text.
First param is `chartWrapper` function that returns wrapper html, you can add styles to the root element of the wrapper by passing string to it.

Example:
```javascript
window.shops = window.shops || {};
window.shops["alza"] = {
  getInfo() {
    const elem = document.querySelector("#pricec");
    if (!elem) return;

    const itemId = (document.querySelector("#deepLinkUrl").getAttribute("content").match(/\d+$/) || [])[0];
    const title = document.querySelector('h1[itemprop="name"]').innerText.trim();

    return { itemId, title };
  },

  insertChartElement(chartMarkup) {
    const elem = document.querySelector;("#pricec");
    if (!elem) throw new Error("Element to add chart not found");
    const styles = "border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;";
    const markup = chartMarkup(styles);
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};

```

