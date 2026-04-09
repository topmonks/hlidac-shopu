#!/usr/bin/env node
import path from "path";
import url from "url";
import esbuild from "esbuild";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const entryPoint = path.resolve(__dirname, "../extension/content.mjs");
const output = path.resolve(__dirname, "../extension/content.js");

esbuild.buildSync({
  color: true,
  entryPoints: [entryPoint],
  target: ["es2020", "firefox109", "safari14.1", "chrome90"],
  charset: "utf8",
  bundle: true,
  outfile: output,
  sourcemap: "linked"
});
