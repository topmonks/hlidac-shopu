#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

const __source_path = path.resolve(__dirname, "../extension");
const __dest_path = path.resolve(
  __dirname,
  "./hlidac-shopu/hlidac-shopu-extension"
);

const scripts = [
  path.resolve(__dirname, "./run-script.js"),
  `${__source_path}/lib`,
  `${__source_path}/shops`,
  `${__source_path}/index.js`
].join(" ");

execSync(`babel ${scripts} --out-file ${__dest_path}/script.js`);
