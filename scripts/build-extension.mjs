#!/usr/bin/env node
import esbuild from "esbuild";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const entryPoint = path.resolve(__dirname, "../extension/content.mjs");
const output = path.resolve(__dirname, "../extension/content.js");

esbuild.buildSync({
  color: true,
  entryPoints: [entryPoint],
  target: ["es2017", "firefox57", "safari12"],
  charset: "utf8",
  bundle: true,
  outfile: output
});
