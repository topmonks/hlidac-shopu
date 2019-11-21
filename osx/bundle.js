#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

const __source_path = path.resolve(__dirname, "../extension");
const __dest_path = path.resolve(
  __dirname,
  "./hlidac-shopu/hlidac-shopu Extension"
);

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
}

/*
 * Bundle websites permissions from extension manifest
 */

try {
  const info_plist_path = `${__dest_path}/Info.plist`;

  const fs = require("fs");
  const plist = require("plist");
  const info_plist = plist.parse(fs.readFileSync(info_plist_path, "utf8"));
  const manifest = require(`${__source_path}/manifest.json`);

  const websites = manifest.content_scripts[0].matches.map(match =>
    match.replace("https://", "").replace("/*", "")
  );
  // overwrite all by parsed websites
  info_plist["NSExtension"]["SFSafariWebsiteAccess"][
    "Allowed Domains"
  ] = websites;

  fs.writeFileSync(info_plist_path, plist.build(info_plist), {
    encoding: "utf8",
    flag: "w"
  });
  console.log("Safari permissions generated.");
} catch (error) {
  console.error("Generate website permissions failed", error);
}
