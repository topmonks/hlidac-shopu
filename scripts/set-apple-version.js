#!/usr/bin/env node
const path = require("path");
const { execSync } = require("child_process");

const extensionPath = path.resolve(__dirname, "../extension");
const appleProjectPath = path.resolve(__dirname, "../apple");

try {
  const { version } = require(`${extensionPath}/manifest.json`);
  changeProductVersion(version);
  execSync(`xcrun agvtool next-version -all`, { cwd: appleProjectPath });

  console.log(`All App versions are now ${version}`);
} catch (error) {
  console.error("Failed to set app version", error.message);
}

function changeProductVersion(version) {
  const filePath = path.resolve(
    appleProjectPath,
    "Hlídač Shopů.xcodeproj/project.pbxproj"
  );

  const prev = execSync(`cat "${filePath}"`).toString();
  const next = prev
    .split("\n")
    .map(line =>
      !line.trim().startsWith("MARKETING_VERSION")
        ? line
        : line.replace(
            /MARKETING_VERSION = \d+\.\d+(\.\d+)?/,
            `MARKETING_VERSION = ${version}`
          )
    )
    .join("\n");

  if (prev === next) {
    console.log("No changes to project.pbxproj");
    return;
  }

  require("fs").writeFileSync(filePath, next);
}
