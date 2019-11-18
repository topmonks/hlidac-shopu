/* global cleanPrice */

function matchGroup(str, regex, groupN) {
  const match = str.match(regex);
  if (!match) {
    return null;
  }
  return match[groupN];
}

window.shops = window.shops || {};
window.shops["alza"] = {
  onDetailPage(cb) {
    cb();
  },

  getDetailInfo() {
    const elem = document.querySelector("#prices");
    if (!elem) return;

    const itemId = (document
      .querySelector("#deepLinkUrl")
      .getAttribute("content")
      .match(/\d+$/) || [])[0];
    const title = document
      .querySelector('h1[itemprop="name"]')
      .innerText.trim();
    const currentPrice =
      cleanPrice("#prices .price_withVat") ||
      cleanPrice("#prices .bigPrice") ||
      cleanPrice(".pricenormal .c2");
    const originalPrice =
      cleanPrice("#prices .origPrice") ||
      cleanPrice("#prices .price_compare") ||
      cleanPrice(".priceCompare .c2") ||
      cleanPrice(".comparePrice .crossPrice");

    return { itemId, title, currentPrice, originalPrice };
  },

  getDailySlasherInfo() {
    const elem = document.querySelector("#dailySlasher");
    if (!elem) return;

    const itemId = matchGroup(
      document.querySelector("#dailySlasher a.btn-buy").href,
      /boxOrder\((\d+)\)/,
      1
    );
    const url = document.querySelector("#dailySlasher a.name").href;
    const currentPrice = cleanPrice(".blPrice .price");
    const originalPrice = cleanPrice(".blPrice .cprice");

    return { itemId, title: null, url, currentPrice, originalPrice };
  },

  getInfo() {
    return this.getDetailInfo() || this.getDailySlasherInfo();
  },

  insertChartElement(chartMarkup) {
    const detailElem = document.querySelector(".priceDetail");
    if (detailElem) {
      const markup = chartMarkup({ "margin-bottom": "0" });
      detailElem.insertAdjacentHTML("afterend", markup);
      return detailElem;
    }

    const dailySlasherElem = document.querySelector("#dailySlasher .running");
    if (dailySlasherElem) {
      const c1w = document.querySelector("#dailySlasher .c1").offsetWidth;
      const markup = chartMarkup({ width: `${c1w - 80}px` });
      dailySlasherElem.insertAdjacentHTML("afterend", markup);
      return dailySlasherElem;
    }

    throw new Error("Element to add chart not found");
  }
};
