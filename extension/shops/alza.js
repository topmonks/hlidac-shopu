/* global $ */

function matchGroup(str, regex, groupN) {
  const match = str.match(regex);
  if (!match) {
    return null;
  }
  return match[groupN];
}

window.shops = window.shops || {};
window.shops["alza"] = {
  onDetailPage(cb) { cb(); },

  getDetailInfo() {
    const elem = $(".priceDetail table#prices");
    if (!elem) return;

    const itemId = ($("#deepLinkUrl").getAttribute("content").match(/\d+$/) || [])[0];
    const title = $('h1[itemprop="name"]').innerText.trim();

    return { itemId, title };
  },

  getDailySlasherInfo() {
    const elem = $("#dailySlasher");
    if (!elem) return;

    const itemId = matchGroup($("#dailySlasher a.btn-buy").href, /boxOrder\((\d+)\)/, 1);
    const url = $("#dailySlasher a.name").href;

    return { itemId, title: null, url };
  },

  getInfo() {
    let info = this.getDetailInfo();
    if (!info) {
      info = this.getDailySlasherInfo();
    }

    return info;
  },

  insertChartElement(chartMarkup) {

    const detailElem = $(".priceDetail table#prices");
    if (detailElem) {
      const markup = chartMarkup();
      detailElem.insertAdjacentHTML("beforebegin", markup);
      return detailElem;
    }

    const dailySlasherElem = $("#dailySlasher .running");
    if (dailySlasherElem) {
      const c1w = $("#dailySlasher .c1").offsetWidth;
      const markup = chartMarkup({ width: `${c1w - 80}px` });
      dailySlasherElem.insertAdjacentHTML("beforebegin", markup);
      return dailySlasherElem;
    }

    throw new Error("Element to add chart not found");
  },
};
