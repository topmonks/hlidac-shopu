#!/usr/bin/env node
const path = require("path");
const { execSync } = require("child_process");

const extensionPath = path.resolve(__dirname, "../extension");
const paths = new Map([
  ["macOS", path.resolve(__dirname, "../apple/osx/hlidac shopu")],
  ["iOS", path.resolve(__dirname, "../apple/ios")]
]);

for (let [os, cwd] of paths.entries()) {
  try {
    const { version } = require(`${extensionPath}/manifest.json`);
    execSync(`xcrun agvtool new-marketing-version ${version}`, { cwd });
    execSync(`xcrun agvtool next-version -all`, { cwd }); // this just increments build num

    console.log(`${os} app version is now ${version}`);
  } catch (error) {
    console.error("Failed to set app version", error.stdout.toString("utf8"));
  }
}
