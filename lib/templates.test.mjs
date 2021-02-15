import { expect } from "@esm-bundle/chai";
import { when } from "./templates.mjs";

describe("directive 'when'", () => {
  describe("given false condition", () => {
    it("should not set part value", () => {
      const part = {
        setValue(x) {
          this.value = x;
        }
      };
      when(false, () => "o_0")(part);
      expect(part.value).to.be.undefined;
    });
  });
});
