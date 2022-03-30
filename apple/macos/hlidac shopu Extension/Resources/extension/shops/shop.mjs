export class Shop {
  async scrape() {
    throw new Error("Method not implemented");
  }

  get injectionPoint() {
    throw new Error("Property not implemented");
  }

  inject(renderMarkup) {
    const [position, selector, extraStyles] = this.injectionPoint;
    const elem = document.querySelector(selector);
    if (!elem) throw new Error("Element to add chart not found");
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

export class AsyncShop extends Shop {
  constructor() {
    super();
    this.loaded = false;
    this.lastHref = null;
    this.firstLoad = true;
  }

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

      const elem = document.querySelector(this.waitForSelector);
      if (!elem) {
        cleanup();
        return;
      }
      const info = await this.scrape();
      if (!info) return;
      const data = await fetchData(info);
      if (!data) return;
      this.loaded = true;
      this.loaded = render(!this.firstLoad, data);
      this.firstLoad = false;
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

export class StatefulShop extends Shop {
  get detailSelector() {
    throw new Error("Property not implemented");
  }

  get observerTarget() {
    return document.body;
  }

  shouldRender(mutations) {
    throw new Error("Method not implemented");
  }

  shouldCleanup(mutations) {
    throw new Error("Method not implemented");
  }

  didMutate(mutations, prop, token) {
    return mutations.find(x =>
      Array.from(x[prop]).find(y => y.classList?.contains(token))
    );
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
