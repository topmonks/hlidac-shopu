import { expect } from "@esm-bundle/chai";
import { html, render } from "lit-html";
import { when } from "./templates.mjs";

describe("directive 'when'", () => {
  describe("given `false` condition", () => {
    it("should not render anything", async () => {
      const container = document.createElement("div");
      const content = "CONTENT";
      render(html`${when(false, () => content)}`, container);
      expect(container.innerHTML).to.not.contain(content);
    });
  });
  describe("given `true` condition", () => {
    it("should render content", async () => {
      const container = document.createElement("div");
      const content = "CONTENT";
      render(html`${when(true, () => content)}`, container);
      expect(container.innerHTML).to.contain(content);
    });
  });
});
