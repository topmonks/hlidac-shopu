import { html, fixture, expect } from "@open-wc/testing";
import "./chart.mjs";

describe("hs-chart", () => {
  describe("given no data", () => {
    it("should not initialize chart", async () => {
      const el = await fixture(html`<hs-chart></hs-chart> `);
      expect(el.chart).to.be.undefined;
    });
  });
  describe("given data", () => {
    const data = {
      originalPrice: [],
      currentPrice: []
    };
    it("should initialize chart", async () => {
      const el = await fixture(html`<hs-chart .data="${data}"></hs-chart>`);
      expect(el.chart).to.be.not.undefined;
    });
  });
});
