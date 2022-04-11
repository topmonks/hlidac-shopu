#!/usr/bin/env node
import path from "path";
import fs from "fs";
import url from "url";

import { Command } from "commander/esm.mjs";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const actorsDir = path.resolve(__dirname, "..", "actors");
const scaffoldDir = path.resolve(__dirname, "scaffolding", "actor");

async function main(actorName, actorApifyName = actorName) {
  if (!actorName) {
    console.error("Please provide an actor name");
    process.exit(1);
  }
  const actorDir = path.join(actorsDir, actorName);
  if (fs.existsSync(actorDir)) {
    console.error(`Directory for ${actorName} actor already exists, aborting`);
    process.exit(1);
  }
  await fs.promises.mkdir(actorDir, { recursive: true });

  const files = await fs.promises.readdir(scaffoldDir);
  for (const file of files) {
    const filePath = path.join(scaffoldDir, file);
    const fileContent = await fs.promises.readFile(filePath, "utf8");
    const newFileContent = fileContent
      .replace(/ACTOR_NAME/g, actorName)
      .replace(/ACTOR_APIFY_NAME/g, actorApifyName)
      .replace(/ACTOR_PACKAGE_NAME/g, `@hlidac-shopu/${actorName}`);
    const newFilePath = path.join(actorDir, file);
    await fs.promises.writeFile(newFilePath, newFileContent, "utf8");
  }
}

const program = new Command("createActor")
  .arguments("<actor-name> [actor-apify-name]")
  .action(main)
  .parse(process.argv);
