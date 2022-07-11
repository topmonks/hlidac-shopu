import { cleanPrice, registerShop } from "../helpers.mjs";
import { Shop } from "./shop.mjs";

function matchGroup(str, regex, groupN) {
  const match = str.match(regex);
  if (!match) {
    return null;
  }
  return match[groupN];
}

function getDetailInfo() {
  const elem = document.querySelector("#prices");
  if (!elem) return;

  const itemId = document
    .querySelector(".shoppingListsAdd")
    .getAttribute("data-id");
  const title = document.querySelector('h1[itemprop="name"]').innerText.trim();
  const currentPrice =
    cleanPrice(".pricenormal .price_withVat") ||
    cleanPrice(`
        #prices .bigPrice,
        .pricenormal .c2,
        .priceactionnormal .c2
      `);
  const originalPrice = cleanPrice(`
        #prices .price_compare,
        .pricenormal .pricecatalog span,
        .comparePrice .crossPrice,
        .priceCompare .c2,
        .pricecatalog1 .c2
      `);

  const imageUrl = document.querySelector("#imgMain").dataset["src"];

  return { itemId, title, currentPrice, originalPrice, imageUrl };
}

function getDailySlasherInfo() {
  const elem = document.querySelector("#dailySlasher");
  if (!elem) return;

  const itemId = matchGroup(elem.querySelector("a.name").href, /dq=(\d+)/, 1);
  const url = document.querySelector("#dailySlasher a.name").href;
  const currentPrice = cleanPrice(".blPrice .price");
  const originalPrice = cleanPrice(".blPrice .cprice");

  return { itemId, title: null, url, currentPrice, originalPrice };
}

function getMobileDetailInfo() {
  const elem = document.querySelector("#detailPage");
  if (!elem) return;

  const itemId = location.href.match(/d(\d+)\.htm$/).pop();
  const title = elem.querySelector("h1").innerText.trim();
  const currentPrice = cleanPrice(".price .normal");
  const originalPrice = cleanPrice(".price .compare");

  return { itemId, title, currentPrice, originalPrice };
}

function getArchiveInfo() {
  const elem = document.querySelector("#detailItem.archive");
  if (!elem) return;

  const itemId = document
    .querySelector(".surveyInfoForm")
    .getAttribute("data-id");
  const title = document.querySelector(".breadcrumbs a.last").innerText.trim();
  const currentPrice = null;
  const originalPrice = null;

  return { itemId, title, currentPrice, originalPrice };
}

function getDetailItemInfo() {
  const elem = document.querySelector(".detail-page");
  if (!elem) return;

  const itemId = elem.dataset.id;
  const title = document.querySelector('h1[itemprop="name"]').innerText.trim();
  const currentPrice = cleanPrice(".price-box__price");
  const originalPrice = cleanPrice(".price-box__compare-price");
  const imageUrl = document.querySelector("#imgMain").dataset["src"];

  return { itemId, title, currentPrice, originalPrice, imageUrl };
}

export class Alza extends Shop {
  async scrape() {
    return (
      getDetailItemInfo() ||
      getDetailInfo() ||
      getMobileDetailInfo() ||
      getDailySlasherInfo() ||
      getArchiveInfo()
    );
  }

  isDetailPage() {
    this.element = document.querySelector("#detailText .buy-buttons");
    return Boolean(this.element);
  }

  injectOnDetailPage(renderMarkup) {
    this.element.insertAdjacentElement(
      "beforebegin",
      renderMarkup({
        "order": "0",
        "margin": "0",
        "padding": "4px 0 8px",
        "background-color": "#fff"
      })
    );
  }

  isMobileDetailPage() {
    this.element = document.querySelector(".main-btn-block");
    return Boolean(this.element);
  }

  injectOnMobileDetailPage(renderMarkup) {
    this.element.insertAdjacentElement("afterend", renderMarkup());
  }

  isDailySlasherPage() {
    this.element = document.querySelector(
      `#dailySlasher .running,
      #dailySlasher .cStart`
    );
    return Boolean(this.element);
  }

  injectOnDailySlasherPage(renderMarkup) {
    const c1w = document.querySelector("#dailySlasher .c1").offsetWidth;
    this.element.insertAdjacentElement(
      "afterend",
      renderMarkup({ width: `${c1w - 80}px` })
    );
  }

  isArchive() {
    this.element = document.getElementById("blockArchiveMoreInfoButtons");
    return Boolean(this.element);
  }

  injectOnArchive(renderMarkup) {
    this.element.insertAdjacentElement("afterend", renderMarkup());
  }

  isDetailItemPage() {
    this.element = document.querySelector(".detail-page .price-detail__row");
    return Boolean(this.element);
  }

  injectOnDetailItemPage(renderMarkup) {
    this.element.insertAdjacentElement(
      "afterend",
      renderMarkup({ "margin": "0 0 20px" })
    );
  }

  inject(renderMarkup) {
    if (this.isDetailItemPage()) {
      return this.injectOnDetailItemPage(renderMarkup);
    } else if (this.isDetailPage()) {
      return this.injectOnDetailPage(renderMarkup);
    } else if (this.isMobileDetailPage()) {
      return this.injectOnMobileDetailPage(renderMarkup);
    } else if (this.isDailySlasherPage()) {
      return this.injectOnDailySlasherPage(renderMarkup);
    } else if (this.isArchive()) {
      return this.injectOnArchive(renderMarkup);
    }
    throw new Error("Element to add chart not found");
  }
}

registerShop(new Alza(), "alza", "alza_sk");
