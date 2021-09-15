import { expect } from "@esm-bundle/chai";
import { shopName } from "./shops.mjs";

describe("Shops", () => {
  describe("shopName", () => {
    it("should return null for unknown domain", () =>
      expect(shopName("https:///www.example.com")).to.be.null);

    [
      ["https://www.obi.cz/", "obi_cz"],
      ["https://www.eva.cz/", "eva_cz"],
      ["https://rozetka.com.ua/", "rozetka_com_ua"],
      ["https://alza.cz/", "alza"],
      ["https://www.alza.cz/", "alza"],
      ["https://m.alza.cz/", "alza"],
      ["https://m.alza.sk/", "alza_sk"],
      ["https://www.alza.sk/", "alza_sk"]
    ].forEach(([domain, key]) =>
      it(`${domain} should return ${key}`, () =>
        expect(shopName(domain)).to.equal(key))
    );
  });
});
