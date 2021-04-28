import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

function matchGroup(str, regex, groupN) {
  const match = str.match(regex);
  if (!match) {
    return null;
  }
  return match[groupN];
}

export class Alza extends Shop {
  getDetailInfo() {
    const elem = document.querySelector("#prices");
    if (!elem) return;

    const itemId = document
      .querySelector(".shoppingListsAdd")
      .getAttribute("data-id");
    const title = document
      .querySelector('h1[itemprop="name"]')
      .innerText.trim();
    const currentPrice =
      cleanPrice(".pricenormal .price_withVat") ||
      cleanPrice(`
        #prices .bigPrice,
        .pricenormal .c2,
        .priceactionnormal .c2
      `);
    const originalPrice = cleanPrice(`
        #prices .price_compare,
        .pricenormal .pricecatalog,
        .comparePrice .crossPrice,
        .priceCompare .c2,
        .pricecatalog1 .c2
      `);

    const imageUrl = document.querySelector("#imgMain").dataset["src"];

    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }

  getDailySlasherInfo() {
    const elem = document.querySelector("#dailySlasher");
    if (!elem) return;

    const itemId = matchGroup(elem.querySelector("a.name").href, /dq=(\d+)/, 1);
    const url = document.querySelector("#dailySlasher a.name").href;
    const currentPrice = cleanPrice(".blPrice .price");
    const originalPrice = cleanPrice(".blPrice .cprice");

    return { itemId, title: null, url, currentPrice, originalPrice };
  }

  getMobileDetailInfo() {
    const elem = document.querySelector("#detailPage");
    if (!elem) return;

    const itemId = location.href.match(/d(\d+)\.htm$/).pop();
    const title = elem.querySelector("h1").innerText.trim();
    const currentPrice = cleanPrice(".price .normal");
    const originalPrice = cleanPrice(".price .compare");

    return { itemId, title, currentPrice, originalPrice };
  }

  getArchiveInfo() {
    const elem = document.querySelector("#detailItem.archive");
    if (!elem) return;

    const itemId = document
      .querySelector(".surveyInfoForm")
      .getAttribute("data-id");
    const title = document
      .querySelector(".breadcrumbs a.last")
      .innerText.trim();
    const currentPrice = null;
    const originalPrice = null;

    return { itemId, title, currentPrice, originalPrice };
  }

  async scrape() {
    return (
      this.getDetailInfo() ||
      this.getMobileDetailInfo() ||
      this.getDailySlasherInfo() ||
      this.getArchiveInfo()
    );
  }

  inject(renderMarkup) {
    const detailElem = document.querySelector("#detailText .buy-buttons");
    if (detailElem) {
      detailElem.insertAdjacentElement(
        "beforebegin",
        renderMarkup({
          "order": "0",
          "margin": "0",
          "padding": "4px 0 8px",
          "background-color": "#fff"
        })
      );
      return detailElem;
    }

    const mobileElem = document.querySelector(".main-btn-block");
    if (mobileElem) {
      mobileElem.insertAdjacentElement("afterend", renderMarkup());
      return mobileElem;
    }

    const dailySlasherElem = document.querySelector(
      "#dailySlasher .running, #dailySlasher .cStart"
    );
    if (dailySlasherElem) {
      const c1w = document.querySelector("#dailySlasher .c1").offsetWidth;
      dailySlasherElem.insertAdjacentElement(
        "afterend",
        renderMarkup({ width: `${c1w - 80}px` })
      );
      return dailySlasherElem;
    }

    const archiveElem = document.getElementById("blockArchiveMoreInfoButtons");
    if (archiveElem) {
      archiveElem.insertAdjacentElement("afterend", renderMarkup());
      return archiveElem;
    }
    throw new Error("Element to add chart not found");
  }
}

registerShop(new Alza(), "alza", "alza_sk");
