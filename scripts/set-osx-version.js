#!/usr/bin/env node
const path = require('path');

const __ext_path = path.resolve(__dirname, "../extension");
const __osx_path = path.resolve(__dirname, "../apple/osx/hlidac shopu");
const __osx_name = "hlidac shopu";

try {
  console.log(`Updation Mac app version`);
  const info_plist_path = `${__osx_path}/${__osx_name}/Info.plist`;

  const fs = require("fs");
  const plist = require("plist");
  const info_plist = plist.parse(fs.readFileSync(info_plist_path, "utf8"));

  const { version } = require(`${__ext_path}/manifest.json`);
  const bundleNumber = info_plist['CFBundleVersion'] + 1;


  info_plist["CFBundleShortVersionString"] = version;
  info_plist["CFBundleVersion"] = bundleNumber;

  fs.writeFileSync(info_plist_path, plist.build(info_plist), {
    encoding: "utf8",
    flag: "w"
  });
  console.log(`Mac app version is now ${version} (${bundleNumber})`);
} catch (error) {
  console.error("Failed to set Mac app version", error);
}