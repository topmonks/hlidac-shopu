export class Shop {
  scheduleRendering(render, cleanup) {
    render();
  }

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

  scheduleRendering(render, cleanup) {
    const observer = new MutationObserver(() => {
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
      this.loaded = true;
      render(!this.firstLoad).then(x => {
        this.loaded = x;
      });
      this.firstLoad = false;
    });
    // Start observing the target node for configured mutations
    observer.observe(document.body, { childList: true, subtree: true });

    if (!document.querySelector(this.waitForSelector)) return;

    this.firstLoad = false;
    return render().then(x => {
      this.loaded = x;
    });
  }
}

export class StatefulShop extends Shop {
  get detailSelector() {
    throw new Error("Property not implemented");
  }
  get observerTarget() {
    throw new Error("Property not implemented");
  }
  shouldRender(mutations) {
    throw new Error("Method not implemented");
  }

  shouldCleanup(mutations) {
    throw new Error("Method not implemented");
  }

  didMutate(mutations, prop, token) {
    return mutations.find(x =>
      Array.from(x[prop]).find(y => y.classList && y.classList.contains(token))
    );
  }

  scheduleRendering(render, cleanup) {
    new MutationObserver(mutations => {
      if (this.shouldRender(mutations)) render();
      if (this.shouldCleanup(mutations)) cleanup();
    }).observe(this.observerTarget, {
      childList: true,
      subtree: true
    });

    const elem = document.querySelector(this.detailSelector);
    if (elem) render();
  }
}
