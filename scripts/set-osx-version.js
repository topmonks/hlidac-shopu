#!/usr/bin/env node
const path = require("path");
const { execSync } = require("child_process");

const extensionPath = path.resolve(__dirname, "../extension");
const osxPath = path.resolve(__dirname, "../apple/osx/hlidac shopu");

try {
  const { version } = require(`${extensionPath}/manifest.json`);
  execSync(`xcrun agvtool new-marketing-version ${version}`, { cwd: osxPath });
  execSync(`xcrun agvtool next-version -all`, { cwd: osxPath }); // this just increments build num

  console.log(`Mac app version is now ${version}`);
} catch (error) {
  console.error("Failed to set Mac app version", error);
}
