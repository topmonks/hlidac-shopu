#!/usr/bin/env node
import formatISO from "date-fns/formatISO/index.js";
import { fetch } from "fetch-h2";
import { parseHTML } from "linkedom/cached";
import fs from "fs";
import path from "path";
import { URL } from "url";

const test = true;
const urls = [
  "https://www.lupa.cz/clanky/black-friday-2020-blyska-se-na-lepsi-casy/",
  "https://www.penize.cz/slevy/422584-pravda-o-slevach-nove-dukazy-jak-e-shopy-caruji-s-cenou"
];

const template = ({ url, title, date, perex, filename }) => `---
title: "${title}"
url: "${url}"
published: ${date}
image: ${filename}
---

${perex}
`;

function writeMdFile(filename, url, title, date, perex, imageExt) {
  const filePath = path.join(
    "www.hlidacshopu.cz",
    "src",
    "data",
    "media",
    `${filename}.md`
  );
  const data = template({
    url,
    title,
    date,
    perex,
    filename: `${filename}.${imageExt}`
  });
  return fs.promises.writeFile(filePath, data);
}

function writeImgFile(filename, imageExt, imageData) {
  const imgPath = path.join(
    "www.hlidacshopu.cz",
    "src",
    "cloudinary",
    "media",
    `${filename}.${imageExt}`
  );
  return fs.promises.writeFile(imgPath, new Uint8Array(imageData));
}

function readLinkedData(document) {
  try {
    return JSON.parse(
      document.querySelector("script[type='application/ld+json']")?.innerHTML ??
        "{}"
    );
  } catch (o_0) {
    return {};
  }
}

async function main() {
  for (let url of urls) {
    console.log(url);
    const resp = await fetch(url, {});
    const { document } = parseHTML(await resp.text());
    const ld = readLinkedData(document);
    const title = (
      ld.headline ??
      document
        .querySelector("[property='og:title']")
        ?.getAttribute("content") ??
      document.querySelector("h1, .post-title, [itemprop=name]")?.textContent
    )?.trim();
    const imageUrl = document
      .querySelector("meta[property='og:image'], meta[property='og:image:url']")
      ?.getAttribute("content");
    let imageResp = imageUrl
      ? fetch(imageUrl, {
          headers: { "Accept": "image/avif,image/webp,image/*" }
        })
      : console.error("Image not found");
    const time = new Date(
      ld.datePublished ??
        document
          .querySelector("meta[property='og:updated_time']")
          ?.getAttribute("content") ??
        document
          .querySelector("meta[property='article:published_time']")
          ?.getAttribute("content") ??
        document.querySelector("time")?.getAttribute("datetime") ??
        document
          .querySelector("[itemprop=datePublished]")
          ?.getAttribute("content") ??
        Date.now()
    );
    const perex = (
      document
        .querySelector("meta[property='og:description']")
        ?.getAttribute("content") ??
      document
        .querySelector("meta[name='description']")
        ?.getAttribute("content")
    )?.trim();
    const parts = new URL(url).host.split(".");
    parts.pop();
    const siteName = parts.pop();

    const date = formatISO(time, { representation: "date" });
    const filename = `${date}-${siteName}`;
    if (imageResp) imageResp = await imageResp;
    const imageExt = imageResp?.headers?.get("content-type")?.split("/")?.pop();

    if (test) {
      console.log({ filename, url, title, date, perex, imageExt });
    } else {
      await Promise.all([
        writeMdFile(filename, url, title, date, perex, imageExt),
        imageResp
          ?.arrayBuffer()
          ?.then(imageData => writeImgFile(filename, imageExt, imageData))
      ]);
    }
  }
}

await main();
process.exit(0);
