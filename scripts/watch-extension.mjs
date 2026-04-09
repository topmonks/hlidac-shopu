#!/usr/bin/env node
import fs from "fs";
import path from "path";
import url from "url";
import chokidar from "chokidar";
import esbuild from "esbuild";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const entryPoint = path.resolve(__dirname, "../extension/content.mjs");
const output = path.resolve(__dirname, "../extension/content.js");
const outputFF = path.resolve(__dirname, "../extension-dist/content.js");

let result;

async function build() {
  try {
    const start = process.hrtime();
    result = await esbuild.context({
      color: true,
      entryPoints: [entryPoint],
      outfile: output,
      bundle: true,
      sourcemap: true,
      target: ["es2017", "firefox57", "safari12"],
      charset: "utf8"
    });
    fs.copyFileSync(output, outputFF);
    const end = process.hrtime(start);
    console.log("Initial build: %ds %dms", end[0], end[1] / 1000000);
  } catch (err) {
    console.error(err);
  }
}

async function rebuild() {
  try {
    const start = process.hrtime();
    await result.rebuild();
    fs.copyFileSync(output, outputFF);
    const end = process.hrtime(start);
    console.log("Rebuild: %ds %dms", end[0], end[1] / 1000000);
  } catch (err) {
    console.error(err);
  }
}

function dispose() {
  result.rebuild.dispose();
}

build();

console.log("Watching extension files");
const watcher = chokidar.watch(["./lib", "./extension"]);
watcher.on("change", () => rebuild());
process.addListener("beforeExit", () => dispose());
