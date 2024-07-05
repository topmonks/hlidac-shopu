import { formatMoney, formatPercents } from "@hlidac-shopu/lib/format.mjs";
import { fetchDiscountDataCZK, fetchDiscountDataPercent } from "@hlidac-shopu/lib/remoting.mjs";
import { shops } from "@hlidac-shopu/lib/shops.mjs";
import { logoTemplate } from "@hlidac-shopu/lib/templates.mjs";
import { html, render } from "lit-html";
import * as rollbar from "./rollbar.js";
import { resultsEmbed } from "./templates";

rollbar.init();

const tableRootPercent = document.getElementById("table-root-percent");
if (tableRootPercent) {
  addEventListener("DOMContentLoaded", async e => {
    try {
      let data = await fetchDiscountDataPercent();
      //add sequenceId
      let a = data;
      for (let i = 0; i < a.length; i++) {
        let obj = a[i];
        obj.sequenceId = i + 1;
        obj.formatedDate = new Intl.DateTimeFormat("cs").format(Date.parse(obj.date));
      }
      data = a;
      tableRootPercent.innerHTML = null;
      render(tableTemplatePercent(data), tableRootPercent);
      const buttonsSection = document.getElementById("below-buttons");
      render(buttonsTemplatePercent(data), buttonsSection);
      document.getElementById("show-more-perc").addEventListener("click", showMorePerc);
      document.getElementById("subscribe-perc").addEventListener("click", subscribe);

      document.querySelector("#table-root-percent").addEventListener("click", e => {
        let t = e.target;
        if (t.href) {
          console.log("in href");
          console.log(`href=${t.href}`);
          renderResultsModal(t.href);
        }
        e.preventDefault(); // Don't follow the links
      });
    } catch (ex) {
      console.error(ex);
    }
  });
}
const tableRootKc = document.getElementById("table-root-kc");
if (tableRootKc) {
  addEventListener("DOMContentLoaded", async e => {
    try {
      let data = await fetchDiscountDataCZK();
      //add sequenceId
      let a = data;
      for (let i = 0; i < a.length; i++) {
        let obj = a[i];
        obj.sequenceId = i + 1;
        obj.formatedDate = new Intl.DateTimeFormat("cs").format(Date.parse(obj.date));
      }
      data = a;
      tableRootKc.innerHTML = null;
      render(tableTemplateKc(data), tableRootKc);
      const buttonsSection = document.getElementById("below-buttons");
      render(buttonsTemplateCZK(data), buttonsSection);
      document.getElementById("show-more-czk").addEventListener("click", showMoreCZK);
      document.getElementById("subscribe-czk").addEventListener("click", subscribe);

      document.querySelector("#table-root-kc").addEventListener("click", e => {
        let t = e.target;
        if (t.href) {
          console.log("in href");
          console.log(`href=${t.href}`);
          renderResultsModal(t.href);
        }
        e.preventDefault(); // Don't follow the links
      });
    } catch (ex) {
      console.error(ex);
    }
  });
}

addEventListener("keydown", e => {
  if (e.key === "Escape") {
    history.pushState({ showModal: false }, null, "/topslevy");
    const modal = document.getElementById("hlidac-shopu-modal");
    modal.classList.add("modal--hidden");
    document.body.classList.remove("no-scroll");
  }
});

function showMorePerc() {
  const secondPart = document.querySelectorAll("[id=secondPart]");
  secondPart.forEach(function (o) {
    o.style.display = "";
  });
  const button = document.getElementById("show-more-perc");
  button.style.display = "none";
}

function showMoreCZK() {
  const secondPart = document.querySelectorAll("[id=secondPart]");
  secondPart.forEach(function (o) {
    o.style.display = "";
  });
  const button = document.getElementById("show-more-czk");
  button.style.display = "none";
}

function subscribeSubmit() {
  document.getElementById("mc-embedded-subscribe-form").submit();
  const modal = document.getElementById("hlidac-shopu-modal");
  modal.classList.add("modal--hidden");
  document.body.classList.remove("no-scroll");
}

function subscribe() {
  const modalRenderRoot = document.getElementById("hlidac-shopu-modal__placeholder");
  render(subscribeModalTemplate(), modalRenderRoot);
  const modal = document.getElementById("hlidac-shopu-modal");
  modal.classList.remove("modal--hidden");
  document.body.classList.add("no-scroll");
  document.getElementById("mc-embedded-subscribe").addEventListener("click", subscribeSubmit);
}

function subscribeModalTemplate() {
  return html`
    <div
      id="hlidac-shopu-modal__not-found"
      class="hs-result mdc-layout-grid__inner"
    >
      <div
        class="mdc-layout-grid__cell mdc-layout-grid__cell--span-12 box box--purple"
      >
        <!-- Begin Mailchimp Signup Form -->
        <link
          href="//cdn-images.mailchimp.com/embedcode/classic-10_7.css"
          rel="stylesheet"
          type="text/css"
        />
        <style type="text/css">
          #mc_embed_signup {
            background: #fff;
            clear: left;
            font:
              14px Helvetica,
              Arial,
              sans-serif;
          }
        </style>

        <div id="mc_embed_signup">
          <form
            action="https://yahoo.us2.list-manage.com/subscribe/post?u=55d428782519059e4ce0ab514&amp;id=1bb2f3682c"
            method="post"
            id="mc-embedded-subscribe-form"
            name="mc-embedded-subscribe-form"
            class="validate"
            target="_blank"
            rel="noopener norefferer"
            novalidate
          >
            <div id="mc_embed_signup_scroll">
              <h2>Přihlásit k odběru top slev</h2>
              <div class="mc-field-group">
                <label for="mce-EMAIL"
                  >Email <span class="asterisk">*</span>
                </label>
                <input
                  type="email"
                  value=""
                  name="EMAIL"
                  class="required email"
                  id="mce-EMAIL"
                />
              </div>
              <div class="mc-field-group">
                <label for="mce-NAME">Jméno a Příjmení </label>
                <input
                  type="text"
                  value=""
                  name="NAME"
                  class=""
                  id="mce-NAME"
                />
              </div>
              <div class="mc-field-group size1of2">
                <label for="mce-PHONE">Telefonní číslo </label>
                <input
                  type="text"
                  name="PHONE"
                  class=""
                  value=""
                  id="mce-PHONE"
                />
              </div>
              <div id="mce-responses" class="clear">
                <div
                  class="response"
                  id="mce-error-response"
                  style="display:none"
                ></div>
                <div
                  class="response"
                  id="mce-success-response"
                  style="display:none"
                ></div>
              </div>
              <!-- real people should not fill this in and expect good things - do not remove this or risk form bot signups-->
              <div
                style="position: absolute; left: -5000px;"
                aria-hidden="true"
              >
                <input
                  type="text"
                  name="b_55d428782519059e4ce0ab514_1bb2f3682c"
                  tabindex="-1"
                  value=""
                />
              </div>
              <div class="clear"></div>
              <div class="btn">
                <a class="button" role="button" id="mc-embedded-subscribe"
                  >Potvrdit</a
                >
              </div>
            </div>
          </form>
        </div>
        <!--End mc_embed_signup-->
      </div>
    </div>
  `;
}

function buttonsTemplatePercent(data) {
  return html`
    <p></p>
    <div class="btn">
      <a class="button" role="button" id="show-more-perc"
        >Zobrazit další slevy</a
      >
      <a class="button" role="button" id="subscribe-perc"
        >Přihlásit k odběru slev</a
      >
    </div>
  `;
}

function buttonsTemplateCZK(data) {
  return html`
    <p></p>
    <div class="btn">
      <a class="button" role="button" id="show-more-czk"
        >Zobrazit další slevy</a
      >
      <a class="button" role="button" id="subscribe-czk"
        >Přihlásit k odběru slev</a
      >
    </div>
  `;
}

function tableTemplatePercent(data) {
  return data.map(shopTemplatePercent);
}

function tableTemplateKc(data) {
  return data.map(shopTemplateKc);
}

function shopTemplatePercent({
  sequenceId,
  historyItemsTDays,
  formatedDate,
  shop,
  itemId,
  itemImage,
  itemName,
  itemUrl,
  minPriceTDays,
  currentPrice,
  maxPrice,
  saleAbs,
  salePerc
}) {
  const rowId = Number(sequenceId);
  let toHide = false;
  if (rowId > 10) {
    toHide = true;
  }
  if (!toHide) {
    return html`
      <tr class="dashboard-row" id="firstPart">
        <th>${sequenceId}</th>
        <td>${formatPercents(salePerc / 100)}</td>
        <td>${formatMoney(Math.round(minPriceTDays))}</td>
        <td>${formatMoney(Math.round(saleAbs))}</td>
        <td>${formatMoney(Math.round(currentPrice))}</td>
        <td style="white-space: nowrap;">${formatedDate}</td>
        <td>${productLinkTemplate(itemName, itemUrl)}</td>
        <td>${logoTemplate(shops.get(shop))}</td>
      </tr>
    `;
  } else {
    return html`
      <tr class="dashboard-row" id="secondPart" style="display: none">
        <th>${sequenceId}</th>
        <td>${formatPercents(salePerc / 100)}</td>
        <td>${formatMoney(Math.round(minPriceTDays))}</td>
        <td>${formatMoney(Math.round(saleAbs))}</td>
        <td>${formatMoney(Math.round(currentPrice))}</td>
        <td style="white-space: nowrap;">${formatedDate}</td>
        <td>${productLinkTemplate(itemName, itemUrl)}</td>
        <td>${logoTemplate(shops.get(shop))}</td>
      </tr>
    `;
  }
}

function shopTemplateKc({
  sequenceId,
  historyItemsTDays,
  formatedDate,
  shop,
  itemId,
  itemImage,
  itemName,
  itemUrl,
  minPriceTDays,
  currentPrice,
  maxPrice,
  saleAbs,
  salePerc
}) {
  const rowId = Number(sequenceId);
  let toHide = false;
  if (rowId > 10) {
    toHide = true;
  }
  if (!toHide) {
    return html`
      <tr class="dashboard-row">
        <th>${sequenceId}</th>
        <td>${formatMoney(Math.round(saleAbs))}</td>
        <td>${formatMoney(Math.round(currentPrice))}</td>
        <td>${formatMoney(Math.round(minPriceTDays))}</td>
        <td>${formatPercents(salePerc / 100)}</td>
        <td style="white-space: nowrap;">${formatedDate}</td>
        <td>${productLinkTemplate(itemName, itemUrl)}</td>
        <td>${logoTemplate(shops.get(shop))}</td>
      </tr>
    `;
  } else {
    return html`
      <tr class="dashboard-row" id="secondPart" style="display: none">
        <th>${sequenceId}</th>
        <td>${formatMoney(Math.round(saleAbs))}</td>
        <td>${formatMoney(Math.round(currentPrice))}</td>
        <td>${formatMoney(Math.round(minPriceTDays))}</td>
        <td>${formatPercents(salePerc / 100)}</td>
        <td style="white-space: nowrap;">${formatedDate}</td>
        <td>${productLinkTemplate(itemName, itemUrl)}</td>
        <td>${logoTemplate(shops.get(shop))}</td>
      </tr>
    `;
  }
}

function productLinkTemplate(itemName, itemUrl) {
  return html` <a href="${itemUrl}" rel="noopener" target="_blank"
    >${itemName}</a
  >`;
}

async function renderResultsModal(detailUrl) {
  const modalRenderRoot = document.getElementById("hlidac-shopu-modal__placeholder");
  render(resultsEmbed(detailUrl), modalRenderRoot);
  showResultsModal();
}

function showResultsModal() {
  const modal = document.getElementById("hlidac-shopu-modal");
  modal.classList.remove("modal--hidden");
  document.body.classList.add("no-scroll");
}
