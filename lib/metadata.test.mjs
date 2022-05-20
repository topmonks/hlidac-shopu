import { expect } from "@esm-bundle/chai";
import { pkey } from "./metadata.mjs";

describe("pkey", () => {
  describe("given empty shop name and itemUrl", () =>
    it("should return null", () => expect(pkey("", "")).to.be.null));
  describe("given shop name and empty itemUrl", () =>
    it("should return null", () => expect(pkey("shop", "")).to.be.null));
  describe("given empty shop name and some itemUrl", () =>
    it("should return null", () => expect(pkey("", "item")).to.be.null));
  describe("given shop name and itemUrl", () =>
    it("should return shop name and itemUrl joined by colon", () =>
      expect(pkey("shop", "itemUrl")).to.eq("shop:itemUrl")));
});
