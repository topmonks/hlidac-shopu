import { expect } from "@esm-bundle/chai";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercents,
  formatShortDate
} from "./format.mjs";

describe("formatMoney", () => {
  describe("given null", () =>
    it("should return null", () => expect(formatMoney(null)).to.be.null));
  it("should replace zeros on decimal places with a dash", () =>
    expect(formatMoney(0.001)).to.eq("0,-"));
  it("should round to two decimal places", () =>
    expect(formatMoney(0.006)).to.eq("0,01"));
  it("should separate thousands with nonbreaking space", () =>
    expect(formatMoney(1000)).to.eq("1 000,-"));
});

describe("formatNumber", () => {
  describe("given null", () =>
    it("should return null", () => expect(formatNumber(null)).to.be.null));
  it("should separate thousands with nonbreaking space", () =>
    expect(formatNumber(1000)).to.eq("1 000"));
});

describe("formatPercents", () => {
  describe("given null", () =>
    it("should return null", () => expect(formatPercents(null)).to.be.null));
  describe("given zero", () => {
    it("should add percent sign preceding with thin space", () =>
      expect(formatPercents(0)).to.eq("0 %"));
  });
  describe("given float number", () => {
    it("should format it as percents", () =>
      expect(formatPercents(0.1)).to.eq("10 %"));
    it("should round it to natural number", () =>
      expect(formatPercents(0.1234)).to.eq("12 %"));
  });
});

describe("formatDate", () => {
  describe("given null", () =>
    it("should return null", () => expect(formatDate(null)).to.be.null));
  describe("given date", () =>
    it("should return czech long date format", () =>
      expect(formatDate(new Date(2021, 0, 1))).to.eq("1. ledna 2021")));
});

describe("formatShortDate", () => {
  describe("given null", () =>
    it("should return null", () => expect(formatShortDate(null)).to.be.null));
  describe("given date", () =>
    it("should return czech short date format", () =>
      expect(formatShortDate(new Date(2021, 0, 1))).to.eq("1. 1.")));
});
