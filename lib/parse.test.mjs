import { expect } from "@esm-bundle/chai";
import { cleanPriceText, cleanUnitPriceText } from "./parse.mjs";

describe("cleanPriceText", () => {
  describe("given null", () => it("should return null", () => expect(cleanPriceText(null)).to.be.null));
  describe("given undefined", () => it("should return null", () => expect(cleanPriceText(undefined)).to.be.null));
  describe("given empty string", () => it("should return null", () => expect(cleanPriceText("")).to.be.null));
  it("should strip whitespace", () => expect(cleanPriceText("24 000 Kč")).to.eq("24000"));
  it("should normalize decimal comma", () => expect(cleanPriceText("34,90 Kč")).to.eq("34.90"));
  it("should take price after cca", () => expect(cleanPriceText("cca 150 Kč")).to.eq("150"));
  it("should return null without digits", () => expect(cleanPriceText("Kč")).to.be.null);
});

describe("cleanUnitPriceText", () => {
  describe("given null", () => it("should return null", () => expect(cleanUnitPriceText(null)).to.be.null));
  describe("given undefined", () => it("should return null", () => expect(cleanUnitPriceText(undefined)).to.be.null));
  it("should take price before /kg", () => expect(cleanUnitPriceText("199 Kč/kg")).to.eq("199"));
  it("should normalize decimal comma", () => expect(cleanUnitPriceText("19,90")).to.eq("19.90"));
});
