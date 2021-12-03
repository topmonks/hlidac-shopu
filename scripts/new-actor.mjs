#!/usr/bin/env node
import path from "path";
import fs from "fs";
import url from "url";

import { Command } from "commander/esm.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const actorsDirName = "actors";
const actorsDir = path.resolve(__dirname, "..", actorsDirName);

async function addActorToWorkspaces(name) {
  const packageJsonPath = path.resolve("./package.json");
  console.log("Adding actor to package.json workspaces");

  const data = await fs.promises.readFile(packageJsonPath, "utf8");
  const packageConfig = JSON.parse(data);

  packageConfig.workspaces.push(name);

  return fs.promises.writeFile(
    packageJsonPath,
    JSON.stringify(packageConfig, null, 2),
    "utf8"
  );
}

async function main(actorName) {
  await fs.promises.mkdir(path.join(actorsDir, actorName));
  await addActorToWorkspaces(path.join(actorsDirName, actorName));
}

const program = new Command("createActor")
  .arguments("<actor-name>")
  .action(main)
  .parse(process.argv);
