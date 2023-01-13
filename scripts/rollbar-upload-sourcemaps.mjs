#!/usr/bin/env node
import path from "path";
import fs from "fs";
import url from "url";
import { fetch } from "@adobe/fetch";
import { FormData } from "formdata-node";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const rootPath = path.resolve(__dirname, "..", "public", "www.hlidacshopu.cz");
const revManifestPath = path.resolve(rootPath, "rev-manifest.json");
const revManifest = JSON.parse(
  fs.readFileSync(revManifestPath).toString("utf-8")
);

Promise.all(
  Object.entries(revManifest)
    .filter(([file]) => file.endsWith(".js"))
    .map(entry => uploadSourceMap(entry))
)
  .then(() => console.log("DONE"))
  .catch(err => console.error(err));

function uploadSourceMap([file, rev]) {
  const mapPath = path.resolve(rootPath, `${file}.map`);
  if (!fs.existsSync(mapPath)) return;

  const formData = new FormData();
  formData.append("access_token", process.argv[2] || "");
  formData.append("version", process.argv[3] || "");
  formData.append("minified_url", `https://www.hlidacshopu.cz/${rev}`);
  formData.append("source_map", fs.createReadStream(mapPath));

  return fetch("https://api.rollbar.com/api/1/sourcemap", {
    method: "POST",
    body: formData
  });
}
