export class Shop {
  scheduleRendering(render, cleanup) {
    render();
  }
  async scrape() {
    throw new Error("Method not implemented");
  }
  inject(renderMarkup) {
    throw new Error("Method not implemented");
  }
}

export class AsyncShop extends Shop {
  constructor() {
    super();
    this.loaded = false;
    this.lastHref = null;
  }
  get waitForSelector() {
    throw new Error("Property not implemented");
  }
  scheduleRendering(render, cleanup) {
    const observer = new MutationObserver(() => {
      if (location.href !== this.lastHref) {
        this.loaded = false;
        this.lastHref = location.href;
      }
      if (this.loaded) return;

      const elem = document.querySelector(this.waitForSelector);
      if (elem) {
        this.loaded = true;
        render(false).then(res => {
          this.loaded = res;
        });
      }
    });
    // Start observing the target node for configured mutations
    observer.observe(document.body, { childList: true, subtree: true });
    addEventListener("load", () => render());
  }
}
