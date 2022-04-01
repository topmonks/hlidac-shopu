#!/usr/bin/env node
import path from "path";
import fs from "fs";
import url from "url";

import { Command } from "commander/esm.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const actorsDirName = "actors";
const actorsDir = path.resolve(__dirname, "..", actorsDirName);

async function main(actorName) {
  const dir = path.join(actorsDir, actorName);
  if (fs.existsSync(dir)) {
    throw new Error(`Actor ${actorName} already exists`);
    return;
  }
  await fs.promises.mkdir();
  throw new Error("Not implemented");
}

const program = new Command("createActor")
  .arguments("<actor-name>")
  .action(main)
  .parse(process.argv);
