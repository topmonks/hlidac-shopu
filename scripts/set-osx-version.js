#!/usr/bin/env node
const path = require('path');
const { execSync } = require("child_process");

const __ext_path = path.resolve(__dirname, "../extension");
const __osx_path = path.resolve(__dirname, "../apple/osx/hlidac shopu");
const __osx_name = "hlidac shopu";

try {
  const { version } = require(`${__ext_path}/manifest.json`);
  execSync(`pushd "${__osx_path}"; xcrun agvtool new-marketing-version ${version}; popd;`);
  execSync(`pushd "${__osx_path}"; xcrun agvtool next-version -all; popd;`); // this jus increments build num

  console.log(`Mac app version is now ${version}`);
} catch (error) {
  console.error("Failed to set Mac app version", error);
}