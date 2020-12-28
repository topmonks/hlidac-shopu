import * as pulumi from "@pulumi/pulumi";
import { startService } from "esbuild";

export async function init() {
  const buildService = await startService();
  const buildTasks: Promise<string>[] = [];

  return {
    build(entrypoint: string, minify: boolean) {
      const promise = buildService
        .build({
          bundle: true,
          minify,
          charset: "utf8",
          platform: "node",
          target: "node12",
          mainFields: ["module", "main"],
          external: ["aws-sdk"],
          entryPoints: [entrypoint],
          write: false
        })
        .then(result => result?.outputFiles?.[0].text ?? "");
      buildTasks.push(promise);
      return promise;
    },
    buildCodeAsset(entrypoint: string, minify: boolean = false) {
      return new pulumi.asset.AssetArchive({
        "index.js": new pulumi.asset.StringAsset(this.build(entrypoint, minify))
      });
    },
    stop() {
      Promise.all(buildTasks)
        .then(() => buildService.stop())
        .catch(err => console.error(err));
    }
  };
}
