import { cleanPrice, registerShop, getLdJsonByType } from "../helpers.mjs";
import { StatefulShop } from "./shop.mjs";

export class Pilulka extends StatefulShop {

  get injectionPoint() {
    return ["afterend", ".service-detail__basket-box"];
  }

  // detailSelector is used during scheduleRendering for initial widget render,
  // but we wanna skip that and only render when shouldRender is called from MutationObserver
  // Note that removing detailSelector would trigger an error so we return dummy value
  get detailSelector() {
    return "nonsense-value-to-never-render-during-initial-scheduleRendering";
  }

  shouldRender(mutations) {
    // rating box is loaded last
    // = safest time to render widget without worrying about it being removed
    const needle = mutations.find(mutation =>
      Array.from(mutation.addedNodes).find(node =>
        node.querySelector?.(".service-detail__main__right__inner .rating--box")
      )
    )
    // console.log(`shouldRender: ${needle ? '✅' : '🔴'}`);
    return !!needle;
  }

  shouldCleanup(mutations) {
    const needle = mutations.find(mutation =>
      Array.from(mutation.removedNodes).find(node =>
        node.getAttribute?.("componentname") === "catalog.product"
      )
    )
    // console.log(`shouldCleanup: ${needle ? '✅' : '🔴'}`);
    return !!needle;
  }


  async scrape() {
    // Give Nuxt 100ms to replace the json-ld script tag with correct data,
    // otherwise it could contain old product when using SPA navigation
    await new Promise(resolve => setTimeout(resolve, 100));
    const product = getLdJsonByType(document, "Product");

    const title = product?.name;
    const domTitle = document.querySelector("h1").innerText
    if (title !== domTitle) console.error("Pilulka.cz - scrape: title mismatch", { title, domTitle });
    const itemId = document.querySelector("[componentname='catalog.product']").id;
    const currentPrice = product?.offers?.price;
    const originalPrice = cleanPrice(`.price-before, .superPrice__old__price`);
    const imageUrl = product?.image?.[0];
    console.log("Hlídačshopů.cz - scrape", { title, itemId, currentPrice, originalPrice, imageUrl });
    return { itemId, title, currentPrice, originalPrice, imageUrl };
  }
}

registerShop(new Pilulka(), "pilulka", "pilulka_sk");
