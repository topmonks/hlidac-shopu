/* global cleanPrice */

function matchGroup(str, regex, groupN) {
  const match = str.match(regex);
  if (!match) {
    return null;
  }
  return match[groupN];
}

window.shops = window.shops || {};
window.shops["alza"] = window.shops["alza_sk"] = {
  onDetailPage(cb) {
    cb();
  },

  getDetailInfo() {
    const elem = document.querySelector("#prices");
    if (!elem) return;

    const itemId = document
      .querySelector(".shoppingListsAdd")
      .getAttribute("data-id");
    const title = document
      .querySelector('h1[itemprop="name"]')
      .innerText.trim();
    const currentPrice = cleanPrice(
      `#prices .price_withVat,
       #prices .bigPrice,
       .pricenormal .c2,
       .priceactionnormal .c2`
    );
    const originalPrice = cleanPrice(
      `#prices .price_compare,
       .comparePrice .crossPrice,
       .priceCompare .c2,
       .pricecatalog1 .c2`
    );

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

  getMobileDetailInfo() {
    const elem = document.querySelector("#detailPage");
    if (!elem) return;

    const itemId = location.href.match(/d(\d+)\.htm$/).pop();
    const title = elem.querySelector("h1").innerText.trim();
    const currentPrice = cleanPrice(".price .normal");
    const originalPrice = cleanPrice(".price .compare");

    return { itemId, title, currentPrice, originalPrice };
  },

  getArchiveInfo() {
    const elem = document.querySelector("#detailItem.archive");
    if (!elem) return;

    const itemId = document.querySelector(".archiveBtn.instructions").href.match(/^javascript:showCommodityManualsDialog\((\d+)\)$/).pop();
    const title = document.querySelector(".breadcrumbs a.last").innerText.trim();
    const currentPrice = null;
    const originalPrice = null;

    return { itemId, title, currentPrice, originalPrice };
  },

  getInfo() {
    return (
      this.getDetailInfo() ||
      this.getMobileDetailInfo() ||
      this.getDailySlasherInfo() ||
      this.getArchiveInfo()
    );
  },

  insertChartElement(chartMarkup) {
    const detailElem = document.querySelector(
      ".priceDetail, .mediaPriceDetail"
    );
    if (detailElem) {
      const markup = chartMarkup({ "margin-bottom": "0" });
      detailElem.insertAdjacentHTML("afterend", markup);
      return detailElem;
    }

    const mobileElem = document.querySelector(".main-btn-block");
    if (mobileElem) {
      const markup = chartMarkup();
      mobileElem.insertAdjacentHTML("afterend", markup);
      return mobileElem;
    }

    const dailySlasherElem = document.querySelector("#dailySlasher .running");
    if (dailySlasherElem) {
      const c1w = document.querySelector("#dailySlasher .c1").offsetWidth;
      const markup = chartMarkup({ width: `${c1w - 80}px` });
      dailySlasherElem.insertAdjacentHTML("afterend", markup);
      return dailySlasherElem;
    }

    const archiveElem = document.getElementById("blockArchiveMoreInfoButtons");
    if (archiveElem) {
      const markup = chartMarkup();
      archiveElem.insertAdjacentHTML("afterend", markup);
      return archiveElem;
    }
    throw new Error("Element to add chart not found");
  }
};
