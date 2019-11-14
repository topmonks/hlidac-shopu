/* global $, cleanPrice */

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
    const elem = $(".priceDetail table#prices");
    if (!elem) return;

    const itemId = ($("#deepLinkUrl")
      .getAttribute("content")
      .match(/\d+$/) || [])[0];
    const title = $('h1[itemprop="name"]').innerText.trim();
    const currentPrice = cleanPrice(".pricenormal .c2");
    const originalPrice = cleanPrice(".priceCompare .c2");

    return { itemId, title, currentPrice, originalPrice };
  },

  getDailySlasherInfo() {
    const elem = $("#dailySlasher");
    if (!elem) return;

    const itemId = matchGroup(
      $("#dailySlasher a.btn-buy").href,
      /boxOrder\((\d+)\)/,
      1
    );
    const url = $("#dailySlasher a.name").href;

    return { itemId, title: null, url };
  },

  getInfo() {
    return this.getDetailInfo() || this.getDailySlasherInfo();
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
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["czc"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".product-detail");
    if (!elem) return;
    const itemId = elem.dataset.productCode;
    const title = $("h1").getAttribute("title");
    const currentPrice = cleanPrice(".price .price-vatin");
    const originalPrice = cleanPrice(".price-before .price-vatin");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = $("#product-price-and-delivery-section");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["datart"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".product-detail-box");
    if (!elem) return;
    const itemId = $("#product-detail-header-top-wrapper").dataset.id;
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".product-detail-price");
    const originalPrice = cleanPrice(
      ".product-detail-strike-price-box .original"
    );

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product-detail-price-box");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice*/

/* exported itesco_loaded */
let itesco_loaded = false;
let last_href = null;

window.shops = window.shops || {};
window.shops["itesco"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== last_href) {
        itesco_loaded = false;
        last_href = window.location.href;
      }
      if (itesco_loaded) return;

      const nakupItesco = $("h1.product-details-tile__title");
      if (nakupItesco) {
        itesco_loaded = true;
        cb().then(res => {
          itesco_loaded = res;
        });
      }

      // const itesco = $(".a-productDetail__buyOnlineButton.ddl");
      // if (itesco) {
      //   cb();
      // }
    });
    // Start observing the target node for configured mutations
    observer.observe(document.body, { childList: true, subtree: true });
  },

  getInfo() {
    const elem = $(".product-details-page");
    if (!elem) return;
    const href = window.location.href;
    const match = href.match(/(\d+)$/);
    var itemId = null;
    if (match && match[1]) {
      itemId = match[1];
    }
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".price-per-sellable-unit .value");
    // TODO: parse originalPrice with regex from .promo-content-small .offer-text
    return { itemId, title, currentPrice };
  },

  insertChartElement(chartMarkup) {
    // nakup.itesco.cz
    let elem = $(".product-details-tile__main");
    // if (!elem) {
    //   // itesco.cz
    //   elem = $(".a-productDetail__buyOnlineButton.ddl");
    // }
    if (!elem) throw new Error("Element to add chart not found");

    const styles = {
      width: "54.16666667%",
      float: "right",
      margin: "0 16px 16px"
    };
    const markup = chartMarkup(styles);
    elem.insertAdjacentHTML("beforeend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["kasa"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".product-detail");
    if (!elem) return;
    const inputZbozi = $('input[name="zbozi"]');
    const itemId = inputZbozi.getAttribute("value");
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice("#real_price");
    const originalPrice = cleanPrice(".before-price .text-strike");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".price-info");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

let kosik_loaded = false;
let kosik_last_href = null;

window.shops = window.shops || {};
window.shops["kosik"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== kosik_last_href) {
        kosik_loaded = false;
        kosik_last_href = window.location.href;
      }
      if (kosik_loaded) return;

      const detail = $(".product-detail__main-info");
      if (detail) {
        kosik_loaded = true;
        cb().then(res => {
          kosik_loaded = res;
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  getInfo() {
    const elem = $("#snippet-addProductToCartForm->.amount[product-data]");
    if (!elem) return;
    try {
      const json = elem.getAttribute("product-data");
      const data = JSON.parse(json);
      const originalPrice = cleanPrice(
        ".price__old-price.price__old-price--exists"
      );
      return {
        itemId: data.id,
        title: data.itemName,
        currentPrice: data.stepPrice,
        originalPrice
      };
    } catch (e) {
      console.error("Could not find product info", e);
    }
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product-detail__cart");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforeBegin", markup);
    return elem;
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["lekarna"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".detail-top");
    if (!elem) return;
    const itemId = $(".product__code span").textContent.trim();
    const title = $("h1").textContent.trim();
    const currentPrice = document
      .querySelector("[itemprop=price]")
      .getAttribute("content");
    const originalPrice = cleanPrice(".price__old");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product__price-and-form");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["mall"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".price-wrapper");
    if (!elem) return;

    const itemId = $('span[data-sel="catalog-number"]').innerText.trim();
    const title = $('h1[itemprop="name"]').innerText.trim();
    const currentPrice = cleanPrice("[itemprop=price]");
    const originalPrice = cleanPrice(".old-new-price .rrp-price");
    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".price-wrapper");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["mironet"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".product_detail");
    if (!elem) return;
    const itemId = $(".product_kosik_info input[name=Code]").value;
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".product_cena_box .product_dph");
    const originalPrice = cleanPrice(".fakcbox23 .product_dph");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product_cena");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["mountfield"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $(".productDetail");
    if (!elem) return;
    const itemId = $(".j-barcode-text")
      .textContent.trim()
      .toLowerCase();
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".actionPrice.val");
    const originalPrice = cleanPrice(".retailPrice.val");

    return { itemId, title, currentPrice, originalPrice, dataType: "dynamo" };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".onStockStore");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

window.shops = window.shops || {};
window.shops["notino"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $("#pdHeader");
    if (!elem) return;
    const scripts = document.getElementsByTagName("script");
    const appoloState = /window.__APOLLO_STATE__\s?=/g;
    let itemId = null;
    var content = null;
    for (const item of scripts) {
      if (item.attributes.length === 0) {
        const match = item.innerHTML.match(appoloState);
        if (match) {
          const scriptText = item.innerHTML.replace(/\r?\n|\r/g, "");
          content = scriptText.substring(
            scriptText.search(appoloState) +
              scriptText.match(appoloState)[0].length,
            scriptText.length
          );
        }
      }
    }
    if (!content) {
      throw new Error("Notino: Cannot find itemId");
    }
    const match = content.match(/Product:(\d+)/);
    if (match && match[1]) {
      itemId = match[1];
    }
    if (!itemId) {
      throw new Error("Notino: cannot find itemId in content");
    }
    const title = $("h1").textContent.trim();
    const currentPrice = cleanPrice(".pp-price span[content]");
    const originalPrice = cleanPrice(
      "[aria-describedby=tippy-tooltip-1] span[content]"
    );

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $("#pdSelectedVariant");
    if (!elem) throw new Error("Element to add chart not found");
    const markup = chartMarkup({margin: "16px"});
    elem.insertAdjacentHTML("afterend", markup);
    return elem;
  }
};
/* global $, cleanPrice */

/* exported itesco_loaded */
let rohlik_loaded = false;
let rohlik_last_href = null;

window.shops = window.shops || {};
window.shops["rohlik"] = {
  onDetailPage(cb) {
    const observer = new MutationObserver(function() {
      if (window.location.href !== rohlik_last_href) {
        rohlik_loaded = false;
        rohlik_last_href = window.location.href;
      }
      if (rohlik_loaded) return;

      const detail = $("#productDetail");
      if (detail) {
        rohlik_loaded = true;
        cb().then(res => {
          rohlik_loaded = res;
        });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  },

  getInfo() {
    const elem = $("#productDetail");
    if (!elem) return;
    const itemId = $("#productDetail button[data-product-id]").dataset
      .productId;
    const title = document.title.split("-");
    const t = title[0].trim();
    const currentPrice = cleanPrice("#productDetail .actionPrice") || cleanPrice("#productDetail .currentPrice");
    const originalPrice = cleanPrice("#productDetail del");

    return { itemId, title: t, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $("#productDetail .AmountCounter");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup();
    elem.insertAdjacentHTML("beforeBegin", markup);
    return elem;
  }
};
/* global $ */

window.shops = window.shops || {};
window.shops["tsbohemia"] = {
  onDetailPage(cb) {
    cb();
  },

  getInfo() {
    const elem = $("#stoitem_detail");
    if (!elem) return;
    const itemId = $(".sti_detail_head").dataset.stiid;
    const title = $("h1").textContent.trim();
    const currentPrice = document
      .querySelector(".prc.wvat .price")
      .textContent.split("Kč")[0]
      .replace(",-", "")
      .replace(/\s/g, "");
    const originalPrice = cleanPrice(".prc.endprc .price");

    return { itemId, title, currentPrice, originalPrice };
  },

  insertChartElement(chartMarkup) {
    const elem = $(".product-tools");
    if (!elem) throw new Error("Element to add chart not found");

    const markup = chartMarkup({
      width: "calc(100% - 32px)",
      "align-self": "center"
    });
    elem.insertAdjacentHTML("beforebegin", markup);
    return elem;
  }
};
/* global plot, GRAPH_ICON */

/* exported $ */
const $ = document.querySelector.bind(document);
const cleanPrice = s => {
  const el = document.querySelector(s);
  if (!el) return null;
  return el.textContent
    .replace("cca", "")
    .replace("včetně DPH", "")
    .replace("Kč", "")
    .replace(",", ".")
    .replace(/\s+/g, "");
};

function _objToCss(obj) {
  return Object.entries(obj)
    .map(([key, value]) => `${key}:${value};`)
    .join("");
}

function chartWrapper(styles) {
  const basicStyles = {
    "background-color": "#fff",
    border: "1px solid #E8E8E8",
    "border-radius": "14px",
    margin: "16px 0",
    padding: "16px",
    clear: "both"
  };
  const resultStyles = _objToCss(Object.assign({}, basicStyles, styles));

  const wrapperMarkup = `
    <div id="hlidacShopu" style="${resultStyles}">
      <style>
        #hlidacShopu .hs-header {
          background: #fff;
          display: flex;
          justify-content: space-between;
          margin-bottom: 16px;
          position: static;
          width: initial;
        }
        #hlidacShopu .hs-header .hs-h4 {
          margin: 0;
          color: #000;
          font-size: 14px;
          line-height: 20px;
          font-weight: 400;
        }
        #hlidacShopu .hs-footer {
          display: flex;
          justify-content: space-between;
          padding-bottom: initial;
          margin-bottom: initial;
          background: initial;
          width: initial;
        }
        #hlidacShopu .hs-footer div {
          font-size: 10px;
          color: #979797;
        }
        #hlidacShopu .hs-footer a {
          color: #545FEF;
        }
        #hlidacShopu .hs-legend {
          display: flex;
          line-height: 28px;
          align-items: center;
          color: #939393;
          font-size: 13px;
          margin: initial;
        }
        #hlidacShopu .hs-real-discount {
          background-color: #FFE607;
          color: #1D3650;
          border-radius: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 12px;
          line-height: 16px;
          padding: 6px 10px 2px;
        }
      </style>
      <div class="hs-header">
        <div>${GRAPH_ICON}</div>
        <div>
          <div class="hs-h4">Vývoj skutečné a uváděné původní ceny</div>
          <div class="hs-legend">
            <div style="width:12px;height:12px;background-color:#5C62CD;border-radius:2px;margin-right:5px"></div>
            <span>Uváděná původní cena</span>
            <div style="width:12px;height:12px;background-color:#FF8787;border-radius:2px;margin: 0 5px 0 10px"></div>
            <span>Prodejní cena</span>
          </div>
        </div>
        <div class="hs-real-discount">
          <abbr title="Reálná sleva se počítá jako aktuální cena po slevě ku maxímální ceně, za kterou se zboží prodávalo za posledních 90 dní.">Reálná sleva*</abbr>
          <br><span id="hlidacShopu2-discount"></span>
        </div>
      </div>
      <canvas id="hlidacShopu2-chart" height="400" width="538"></canvas>
      <div class="hs-footer">
        <div>Více informací na <a href="https://www.hlidacshopu.cz/">HlídačShopů.cz</a></div>
        <div>Vytvořili
          <a href="https://www.apify.com/">Apify</a>,
          <a href="https://www.keboola.com/">Keboola</a>
          &amp; <a href="https://www.topmonks.com/">TopMonks</a>
        </div>
      </div>
    </div>
  `;
  return wrapperMarkup;
}

function fetchData(url, itemId, title, originalPrice, currentPrice) {
  const searchString = new URLSearchParams({
    metadata: 1,
    url,
    itemId,
    title,
    originalPrice,
    currentPrice
  });
  return fetch(`https://api.hlidacshopu.cz/shop?${searchString}`).then(
    response => {
      if (response.status === 404) {
        return response.json();
      }
      if (!response.ok) {
        throw new Error("HTTP error, status = " + response.status);
      }
      return response.json();
    }
  );
}

function* daysBetween(start, end) {
  const startDay = new Date(start.getTime());
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end.getTime());
  endDay.setHours(0, 0, 0, 0);
  for (const d = startDay; d <= endDay; d.setDate(d.getDate() + 1)) {
    yield new Date(d.getTime());
  }
}

/**
 * Get shop name from 2nd level domain
 *
 * www.alza.cz => alza
 */
function getShopName(href) {
  const url = new URL(href);
  const domainParts = url.host.split(".");
  domainParts.pop();
  return domainParts.pop();
}

function createDataset(data) {
  const parseTime = s => {
    const d = new Date(s);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const dataMap = new Map(data.map(i => [parseTime(i.d).getTime(), i]));
  const dataset = {
    originalPrice: [],
    currentPrice: []
  };
  let lastDay = data[0];
  for (const day of daysBetween(
    parseTime(data[0].d),
    parseTime(data[data.length - 1].d)
  )) {
    let item = dataMap.get(day.getTime());
    if (!item) {
      item = lastDay;
    } else {
      lastDay = item;
    }
    dataset.originalPrice.push({ x: day, y: item.o === "" ? null : item.o });
    dataset.currentPrice.push({ x: day, y: item.c === "" ? null : item.c });
  }
  return dataset;
}

const formatPercents = x => `${Math.round(-1 * x).toLocaleString("cs")} %`;

async function main() {
  const shopName = getShopName(window.location.href);
  const shop = window.shops[shopName];
  if (!shop) {
    console.error("No shop found");
    return;
  }
  shop.onDetailPage(async function() {
    try {
      const info = shop.getInfo();
      if (!info) {
        // no detail page
        return false;
      }

      const checkElem = document.getElementById("hlidacShopu2-chart");
      if (checkElem) {
        return false;
      }
      const url = info.url || window.location.href;
      const res = await fetchData(
        url,
        info.itemId,
        info.title,
        info.originalPrice,
        info.currentPrice
      );
      if (res.metadata.error) {
        console.log("Error fetching data: ", res.metadata.error);
        return false;
      }
      if (res.data.length === 0) {
        console.log("No data found:", res);
        return false;
      }
      // Inject our HTML code
      shop.insertChartElement(styles => chartWrapper(styles));

      const discountEl = document.getElementById("hlidacShopu2-discount");
      const discount = res.metadata["real_sale"];
      if (discount !== "null") {
        discountEl.innerText = formatPercents(parseFloat(discount));
      } else {
        discountEl.parentElement.classList.add("discount--no-data");
      }
      const dataset = createDataset(res.data);
      const plotElem = document.getElementById("hlidacShopu2-chart");

      console.log(`Graph loaded for ${info.itemId}`, { info, res });
      plot(plotElem, dataset);
      return true;
    } catch (e) {
      console.error(e);
    }
  });
}

main().catch(err => console.error(err));
