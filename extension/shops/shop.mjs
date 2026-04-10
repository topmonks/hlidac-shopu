/**
 * @typedef {Object} ProductInfo
 * @property {string} itemId
 * @property {string} title
 * @property {string} currentPrice
 * @property {string|null} originalPrice
 * @property {string} imageUrl
 */

/**
 * @abstract
 */
export class Shop {
  /**
   * @abstract
   * @returns {Promise<ProductInfo|void>}
   */
  async scrape() {
    throw new Error("Method not implemented");
  }

  /**
   * @abstract
   * @return {[InsertPosition,string]|[InsertPosition,string,Record<string, any>]}
   */
  get injectionPoint() {
    throw new Error("Property not implemented");
  }

  inject(renderMarkup) {
    const [position, selector, extraStyles] = this.injectionPoint;
    const elem = document.querySelector(selector);
    if (!elem) throw new Error(`Element to add chart not found; selector: ${selector}`);
    elem.insertAdjacentElement(position, renderMarkup(extraStyles));
    return elem;
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    const info = await this.scrape();
    if (!info) return;
    const data = await fetchData(info);
    if (!data) return;
    render(false, data);
  }
}

/**
 * @abstract
 */
export class AsyncShop extends Shop {
  constructor() {
    super();
    this.loaded = false;
    this.loading = false;
    this.lastHref = null;
    this.firstLoad = true;
  }

  /**
   * @abstract
   * @return {string} CSS selector of Element to wait for
   */
  get waitForSelector() {
    throw new Error("Property not implemented");
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    const observer = new MutationObserver(async () => {
      if (location.href !== this.lastHref) {
        this.loaded = false;
        this.lastHref = location.href;
      }
      if (this.loaded) return;
      if (this.loading) return;

      const elem = document.querySelector(this.waitForSelector);
      if (!elem) {
        cleanup();
        return;
      }
      const info = await this.scrape();
      if (!info) return;
      this.loading = true;
      try {
        const data = await fetchData(info);
        if (!data) {
          // No data for this URL — clean up any stale chart from a previous
          // render so the user does not see incorrect data.
          cleanup();
          return;
        }
        this.loaded = render(!this.firstLoad, data);
        this.firstLoad = false;
      } finally {
        // Always release the loading lock; otherwise an early return in any
        // of the await branches would leave the observer permanently
        // bailing at `if (this.loading) return`.
        this.loading = false;
      }
    });
    // Start observing the target node for configured mutations
    observer.observe(document.body, { childList: true, subtree: true });

    if (!document.querySelector(this.waitForSelector)) return;
    const info = await this.scrape();
    if (!info) return;
    const data = await fetchData(info);
    if (!data) return;
    this.loaded = render(false, data);
    this.firstLoad = false;
  }
}

/**
 * @abstract
 */
export class StatefulShop extends Shop {
  /**
   * @abstract
   */
  get detailSelector() {
    throw new Error("Property not implemented");
  }

  /**
   * @abstract
   */
  get observerTarget() {
    return document.body;
  }

  /**
   * @abstract
   */
  shouldRender(mutations) {
    throw new Error("Method not implemented");
  }

  /**
   * @abstract
   */
  shouldCleanup(mutations) {
    throw new Error("Method not implemented");
  }

  didMutate(mutations, prop, token) {
    return mutations.find(x => Array.from(x[prop]).find(y => y.classList?.contains(token)));
  }

  async scheduleRendering({ render, cleanup, fetchData }) {
    new MutationObserver(async mutations => {
      if (this.shouldRender(mutations)) {
        const info = await this.scrape();
        if (!info) return;
        const data = await fetchData(info);
        if (!data) return;
        render(false, data);
      }
      if (this.shouldCleanup(mutations)) cleanup();
    }).observe(this.observerTarget, {
      subtree: true,
      childList: true
    });

    const elem = document.querySelector(this.detailSelector);
    if (!elem) return;
    const info = await this.scrape();
    if (!info) return;
    const data = await fetchData(info);
    if (!data) return;
    render(false, data);
  }
}
