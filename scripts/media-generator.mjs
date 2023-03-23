#!/usr/bin/env node
import { fetch } from "@adobe/fetch";
import formatISO from "date-fns/formatISO/index.js";
import { parseHTML } from "linkedom/cached";
import fs from "fs";
import path from "path";
import { URL } from "url";

const test = false;
const urls = [
  "https://www.slowfemme.com/magazine/proc-nakupujeme-roli-hraji-slevy-stres",
  "https://www.geekboy.cz/clanek/rozsireni-do-prohlizece/#hlidac-shopu",
  "https://ct24.ceskatelevize.cz/domaci/3555471-umele-navysovane-ceny-pred-slevovymi-akcemi-dostanou-stopku",
  "https://www.startupinsider.cz/digital/na-black-friday-2022-evropske-komisi-pomahal-dohlizet-tym-ceskeho-hlidace-shopu-548674",
  "https://www.focus-age.cz/m-journal/aktuality/5-let-zkusenosti-s-hlidacem-shopu-premenili-cesi-do-projektu--ktery-pomahal-evropske-komisi-dohlizet-na-zakonnost-slev-behem-black-friday__s288x16930.html",
  "https://cc.cz/cesi-upozornuji-na-klamave-slevy-e-shopu-jejich-projekt-otestovala-evropska-komise-v-11-zemich/",
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

/**
 * Reads the response text in given text encoding.
 * When charset isn't defined on `content-type` header it falls back to `utf-8`.
 * @param {Response} resp
 * @returns {string}
 */
async function readTextResponse(resp) {
  const contentType = resp.headers.get("content-type");
  const [, charset] = contentType?.split("charset=");
  const decoder = new TextDecoder(charset ?? "utf-8");
  const buffer = await resp.arrayBuffer();
  return decoder.decode(buffer);
}

async function main() {
  for (let url of urls) {
    console.log(url);
    const resp = await fetch(url, {});
    const { document } = parseHTML(await readTextResponse(resp));
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
