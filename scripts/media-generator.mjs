#!/usr/bin/env node
import formatISO from "date-fns/formatISO/index.js";
import fetch from "node-fetch/lib/index.mjs";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

const template = ({ url, title, date, perex, filename }) => `---
title: "${title}"
url: "${url}"
published: ${date}
image: ${filename}
---

${perex}
`;

const urls = [
  "https://www.lupa.cz/clanky/black-friday-2020-blyska-se-na-lepsi-casy/",
  "https://www.penize.cz/slevy/422584-pravda-o-slevach-nove-dukazy-jak-e-shopy-caruji-s-cenou",
];

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

const test = false;

for (let url of urls) {
  const {
    window: { document }
  } = await JSDOM.fromURL(url);

  let ld;
  try {
    ld = JSON.parse(
      document.querySelector("script[type='application/ld+json']")?.innerHTML ??
        "{}"
    );
  } catch (o_0) {
    ld = {};
  }
  const title = (
    ld.headline ??
    document.querySelector("[property='og:title']")?.content ??
    document.querySelector("h1, .post-title, [itemprop=name]")?.textContent
  )?.trim();
  const imageUrl = document.querySelector(
    "meta[property='og:image'], meta[property='og:image:url']"
  )?.content;
  let imageResp = fetch(imageUrl);
  const time = new Date(
    ld.datePublished ??
      document.querySelector("meta[property='og:updated_time']")?.content ??
      document.querySelector("meta[property='article:published_time']")
        ?.content ??
      document.querySelector("time")?.getAttribute("datetime") ??
      document
        .querySelector("[itemprop=datePublished]")
        ?.getAttribute("content") ??
      Date.now()
  );
  const perex = (
    document.querySelector("meta[property='og:description']")?.content ??
    document.querySelector("meta[name='description']").content
  )?.trim();
  const parts = document.location.host.split(".");
  parts.pop();
  const siteName = parts.pop();

  const date = formatISO(time, { representation: "date" });
  const filename = `${date}-${siteName}`;
  imageResp = await imageResp;
  const imageExt = imageResp.headers.get("content-type").split("/").pop();

  if (test) {
    console.log({ filename, url, title, date, perex, imageExt });
  } else {
    await Promise.all([
      writeMdFile(filename, url, title, date, perex, imageExt),
      imageResp
        .arrayBuffer()
        .then(imageData => writeImgFile(filename, imageExt, imageData))
    ]);
  }
}
