import chokidar from "chokidar";
import esbuild from "esbuild";
import path from "path";

const entryPoint = path.resolve("extension/content.mjs");
const output = path.resolve("extension/content.js");

async function build() {
  const service = await esbuild.startService();
  try {
    console.time("build");
    await service.build({
      color: true,
      entryPoints: [entryPoint],
      outfile: output,
      bundle: true
    });
    console.timeEnd("build");
  } catch (err) {
    console.error(err);
  } finally {
    service.stop();
  }
}

console.log("Watchin extension files");

build();

const watcher = chokidar.watch(["lib/**/*.js", "extension/**/*.mjs"]);
watcher.on("change", () => build());
