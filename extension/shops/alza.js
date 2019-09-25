const $ = document.querySelector.bind(document);

window.shops = window.shops || {};
window.shops["alza"] = {
  name: "alza",

  getInfo() {
    const elem = $("#pricec");
    if (!elem) return;

    const itemId = ($("#deepLinkUrl").getAttribute("content").match(/\d+$/) || [])[0];
    const title = $('h1[itemprop="name"]').innerText.trim();

    return { itemId, title };
  },

  insertChartElement(chartMarkup) {
    const elem = $("#pricec");
    if (!elem) throw new Error("Element to add chart not found");
    const styles = "border: 1px solid lightgray; margin: 5px; padding: 5px; margin-bottom: 50px;";
    const markup = chartMarkup(styles);
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  },
};
