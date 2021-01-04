#!/usr/bin/env node
const path = require("path");
const { execSync } = require("child_process");

const extensionPath = path.resolve(__dirname, "../extension");
const osxPath = path.resolve(__dirname, "../apple/osx/hlidac shopu");
const iosPath = path.resolve(__dirname, "../apple/ios");

for (let cwd of [osxPath, iosPath]) {
  try {
    const { version } = require(`${extensionPath}/manifest.json`);
    execSync(`xcrun agvtool new-marketing-version ${version}`, { cwd });
    execSync(`xcrun agvtool next-version -all`, { cwd }); // this just increments build num

    console.log(`app version is now ${version}`);
  } catch (error) {
    console.error("Failed to set app version", error.stdout.toString("utf8"));
  }
}
