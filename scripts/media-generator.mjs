import formatISO from "date-fns/formatISO/index.js";
import fetch from "node-fetch/lib/index.mjs";
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";

const template = ({ url, title, date, perex, filename }) => `
---
title: "${title}"
url: "${url}"
published: ${date}
image: ${filename}
---

${perex}
`;

const urls = [
  "https://www.ceskenoviny.cz/zpravy/hlidac-shopu-vetsina-e-shopu-pocita-slevy-z-doporucene-ceny/1963942",
  "https://www.mobilmania.cz/clanky/nespalte-se-pri-black-friday-ani-nikdy-jindy-skutecne-slevy-vam-pohlida-hlidac-shopu/sc-3-a-1349977/default.aspx",
  "https://insmart.cz/overeni-slevy-v-eshopu-hlidac-shopu/",
  "http://www.24zpravy.com/ekonomika/black-friday-letos-startuje-online-utraty-mohou-poprve-presahnout-miliardu-korun-pozor-na-manipulaci-s-cenou/476804-zpravy",
  "https://www.svetandroida.cz/hlidac-shopu-kontrola-slev/",
  "https://tech.ihned.cz/geekosfera/c1-66849970-black-friday-neni-vyprodej-nejlepsi-nakupy-nabizeji-primo-vyrobci-vymetani-skladu-je-pod-uroven",
  "https://www.czechcrunch.cz/2020/11/klamave-ceny-byly-dlouho-standard-rikaji-tvurci-hlidace-shopu-letos-zdvojnasobili-pocet-sledovanych-e-shopu",
  "https://www.podnikatel.cz/clanky/velky-test-black-friday-u-e-shopu-alza-cz-mall-cz-a-datart-cz-fixluji-slevy/",
  "https://www.zive.cz/clanky/analyza-black-friday-inzerovane-slevy-az-80--realne-okolo-15-/sc-3-a-207245/default.aspx",
  "https://www.podnikatel.cz/clanky/black-friday-v-ceskem-podani-nektere-e-shopy-opet-podvadely-se-slevami/",
  "https://mam.cz/zpravy/2020-11/hlidac-shopu-chrani-pred-falesnymi-black-friday-slevami-nove-hlida-e-shopy-i-na-slovensku/"
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

const test = true;

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
