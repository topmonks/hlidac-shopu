import { cleanPrice, registerShop, waitForHydration } from "../helpers.mjs";
import { AsyncShop } from "./shop.mjs";

// Teta is a Nuxt 3 SPA. We need to handle the hydration race here:
// Vue treats our injected node as a hydration mismatch and wipes it on the
// next render pass, so we wait for the `.c-detail` subtree to stabilize
// before letting AsyncShop start rendering.
//
// Note we deliberately do NOT scrape the JSON-LD `<script>` in the head:
// Nuxt 3's `useHead` does not run on client-side navigation, so after a SPA
// route change the JSON-LD is the previous page's metadata. Everything we
// need (slug, title, prices) is available in the visible DOM, which IS
// up-to-date because `waitForSelector` matched and `.c-detail` stabilized.
// The API at /v2/detail looks up Teta products by URL slug, not by SKU.
export class TetaDrogerie extends AsyncShop {
  get waitForSelector() {
    return ".c-detail__sticky-side .c-product-price--detail";
  }

  get injectionPoint() {
    return ["afterend", ".c-detail__sticky-side .c-product-price--detail"];
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    const tryRender = async () => {
      if (location.href !== this.lastHref) {
        this.loaded = false;
        this.lastHref = location.href;
      }
      if (this.loaded || this.loading) return;
      // Bail cheaply (no lock) if we are not on a product page yet — otherwise
      // a long waitForHydration would block subsequent observer ticks during
      // SPA navigation.
      if (!document.querySelector(this.waitForSelector)) {
        cleanup();
        return;
      }
      this.loading = true;
      try {
        await waitForHydration(".c-detail");
        // URL may have changed again while we were waiting; if so, re-trigger
        if (location.href !== this.lastHref) {
          this.loaded = false;
          this.lastHref = location.href;
          setTimeout(tryRender, 0);
          return;
        }
        // Selector might have disappeared during the wait (Vue replacing the
        // detail subtree); only proceed if it's still there.
        if (!document.querySelector(this.waitForSelector)) {
          cleanup();
          return;
        }
        const info = await this.scrape();
        if (!info) return;
        const data = await fetchData(info);
        if (!data) return;
        this.loaded = render(!this.firstLoad, data);
        this.firstLoad = false;
      } finally {
        this.loading = false;
      }
    };

    new MutationObserver(tryRender).observe(document.body, { childList: true, subtree: true });
    await tryRender();
  }

  async scrape() {
    const sticky = document.querySelector(".c-detail__sticky-side");
    if (!sticky) return;

    // Slug is the URL segment after /eshop/katalog/ — same shape as
    // `lib/shops.mjs`'s tetadrogerieCz.parse(). The API resolves Teta
    // products by slug rather than by SKU.
    const slug = location.pathname.replace(/^\/eshop\/katalog\//, "");
    if (!slug) return;

    const actionPrice = cleanPrice(sticky.querySelector(".c-product-price__value--action"));
    return {
      itemId: slug,
      title: document.querySelector("h1")?.textContent?.trim(),
      currentPrice: actionPrice ?? cleanPrice(sticky.querySelector(".c-product-price__former-price")),
      originalPrice: actionPrice ? cleanPrice(sticky.querySelector(".c-product-price__former-price--sale")) : null,
      imageUrl: undefined
    };
  }
}

registerShop(new TetaDrogerie(), "tetadrogerie_cz");
