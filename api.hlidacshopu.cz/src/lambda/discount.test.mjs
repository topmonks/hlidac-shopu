import { expect } from "@esm-bundle/chai";
import { prepareData } from "./discount.mjs";

describe("Discount", () => {
    const getHistoricalDataJResult = {"json":[{"c":"499","d":"2021-03-13","o":""},{"c":"499","d":"2021-03-14","o":""},{"c":"","d":"2021-07-15","o":""},{"c":"499","d":"2021-09-29","o":""},{"c":"359","d":"2021-10-29","o":"499"},{"c":"359","d":"2021-10-30","o":"499"},{"c":"359","d":"2021-11-08","o":"499"}]};
    const result = prepareData(getHistoricalDataJResult);
    describe("prepareData", () =>
    it("should to have lengthOf at least 3", () => expect(result).to.have.lengthOf.at.least(3)));
});
