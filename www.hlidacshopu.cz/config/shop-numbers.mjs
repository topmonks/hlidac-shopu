import { writeFile } from "node:fs/promises";
import projectPath from "@hckr_/blendid/lib/projectPath.mjs";
import { fetchShopsStats } from "@hlidac-shopu/lib/remoting.mjs";
import DefaultRegistry from "undertaker-registry";

export class ShopNumbersRegistry extends DefaultRegistry {
  constructor(config, pathConfig) {
    super();
    this.config = config;
    this.pathConfig = pathConfig;
  }

  /**
   * @param {Undertaker} taker
   */
  init({ task }) {
    task("prepare-shop-numbers-data", async () => {
      const stats = await fetchShopsStats();
      const targetPath = projectPath(this.pathConfig.src, this.pathConfig.data.src, "shopNumbers.json");
      return writeFile(targetPath, JSON.stringify(stats));
    });
  }
}
