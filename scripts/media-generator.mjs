#!/usr/bin/env node
import { fetch } from "@adobe/helix-fetch";
import formatISO from "date-fns/formatISO/index.js";
import { parseHTML } from "linkedom/cached";
import fs from "fs";
import path from "path";
import { URL } from "url";

const test = true;
const urls = [
  "https://www.seznamzpravy.cz/clanek/ekonomika-byznys-trendy-analyzy-konec-slev-ktere-nikdy-nebyly-e-shopy-je-musi-zacit-pocitat-jinak-186075",
  "https://www.mesec.cz/clanky/zakaz-falesnych-slev-novela-zakona-ma-zabranit-dalsim-podvodum-na-spotrebitele/",
  "https://www.reflex.cz/clanek/zajimavosti/112941/nova-evropska-smernice-zmeni-pravidla-o-slevach-kde-a-jake-slevy-cesi-vyhledavaji.html",
  "https://cc.cz/komunikuji-e-shopy-slevy-ferove-hlidac-shopu-kontroluje-jestli-obchody-nebalamuti-zakazniky/",
  "https://connect.zive.cz/clanky/pochvalu-za-ferove-slevy-zaslouzi-alza-a-czc-odstrasujicimi-priklady-jsou-mountfield-a-aaaauto/sc-320-a-217052/default.aspx",
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
