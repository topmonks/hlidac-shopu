#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

const __source_path = path.resolve(__dirname, "../../extension");
const __osx_root_path = path.resolve(__dirname);
const __dest_path = path.resolve(__osx_root_path, "hlidac-shopu Extension");
const manifest = require(`${__source_path}/manifest.json`);

let error = false;

/*
 * Concat extension javascript files to one script.js
 */

try {
  const scripts = [
    path.resolve(__dirname, "./run-script.js"),
    `${__source_path}/lib/*`,
    `${__source_path}/shops/*`,
    `${__source_path}/index.js`
  ].join(" ");

  execSync(`rm "${__dest_path}/script.js" || true`);
  execSync(`cat ${scripts} > "${__dest_path}/script.js"`);
  console.log("Safari script.js bundled.");
} catch (error) {
  console.error("Bundle script failed.", error);
  error = true;
}

/*
 * Bundle websites permissions from extension manifest
 */

try {
  const info_plist_path = `${__dest_path}/Info.plist`;

  const fs = require("fs");
  const plist = require("plist");
  const info_plist = plist.parse(fs.readFileSync(info_plist_path, "utf8"));

  const websites = manifest.content_scripts[0].matches.map(match =>
    match.replace("https://", "").replace("/*", "")
  );
  // overwrite all by parsed websites
  info_plist["NSExtension"]["SFSafariWebsiteAccess"][
    "Allowed Domains"
  ] = websites;

  // add compliance
  info_plist["ITSAppUsesNonExemptEncryption"] = false;

  fs.writeFileSync(info_plist_path, plist.build(info_plist), {
    encoding: "utf8",
    flag: "w"
  });
  console.log("Safari permissions generated.");
} catch (error) {
  console.error("Generate website permissions failed", error);
  error = true;
}

/*
 * Sync version with manifest and bumb build version
 */

try {
  execSync(
    `pushd ${__osx_root_path}; xcrun agvtool new-marketing-version ${manifest.version}; popd;`
  );
  execSync(`pushd ${__osx_root_path}; xcrun agvtool next-version -all; popd;`); // this jus increments build num
  console.log("Safari versions updated.");
} catch (error) {
  console.error("Failed to update versions of Safari extension", error);
  error = true;
}

/*
 * Commit new bundle
 */

try {
  if (!error) {
    execSync(
      `git add ${__osx_root_path} && git commit -m "Bundled Safari ${manifest.version} version"`
    );
  }
} catch (error) {
  console.error("Failed to commit bundled updates.");
}
