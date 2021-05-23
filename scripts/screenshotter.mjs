#!/usr/bin/env node
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pathToExtension = path.resolve(__dirname, "../extension");

const urlSet = [
  "https://www.aaaauto.cz/cz/skoda-kodiaq/car.html?id=385818170#category=45&promo=gm",
  "https://www.alza.cz/trhakdne",
  "https://www.alza.cz/screenshield-motorola-moto-g7-power-xt1955-4-na-displej-d5600645.htm",
  "https://m.alza.sk/intel-core-i7-9700-d5632692.htm",
  "https://www.alza.sk/wd-black-sn750-nvme-ssd-1tb-d5534244.htm",
  "https://www.benu.cz/cemio-metric-308-smart-bezkontaktni-teplomer-cr-sk",
  "https://www.czc.cz/samsung-qe75q800t-189cm/283241a/produkt",
  "https://www.czc.cz/max-vysuvny-polohovatelny-drzak-mtm9335t-pro-tv-37-70-cerna/309098/produkt",
  "https://www.datart.cz/iphone-11-64gb-white-mwlu2cn-a.html",
  "https://www.datart.sk/iphone-11-64gb-black-mwlt2cn-a.html",
  "https://www.kasa.cz/televize-samsung-qe65q77ta-stribrna/",
  "https://www.kosik.cz/produkt/vitalbite-polomekke-krouzky-pro-dospele-psy-bohate-na-hovezi",
  "https://www.lekarna.cz/vibovit-imunity-jelly-50/",
  "https://www.mall.cz/reproduktory-tablety/lamax-sentinel2",
  "https://www.mall.sk/elektricke-panvice/remoska-r-21-original-teflon-classic",
  "https://www.mironet.cz/ps5-dualsense-wireless-controller-cervena+dp476176/",
  "https://www.mountfield.cz/zahradni-traktor-mtf-1430-m-1tkk0115",
  "https://www.mountfield.sk/bazen-azuro-vario-v1-kruhove-teleso-3bna1173",
  "https://www.notino.cz/yves-saint-laurent/la-nuit-de-lhomme-eau-electrique-toaletni-voda-pro-muze/p-650890/",
  "https://www.notino.sk/hugo-boss/boss-no6-bottled-toaletna-voda-pre-muzov/p-63109/",
  "https://www.okay.cz/mobilni-telefon-vivax-fly-5-lite-3gb-32gb-modra-2/",
  "https://www.okay.sk/fen-rowenta-cv5090-2300w/",
  "https://www.pilulka.cz/curaprox-cps-011-prime-8-ks-blister-refi",
  "https://www.pilulka.sk/yves-rocher-sviezi-sampon-na-mastne-vlasy",
  "https://www.prozdravi.cz/zdravi/areko-ovosan-90-kapsli.html",
  "https://www.rohlik.cz/cenove-trhaky?productPopup=1338819-gurmet-rump-steak-kvetova-spicka",
  "https://www.sleky.cz/gs-echinacea-forte-600-tbl-70-20-zdarma",
  "https://nakup.itesco.cz/groceries/en-GB/products/2001019467158",
  "https://potravinydomov.itesco.sk/groceries/en-GB/products/2002006194330",
  "https://www.tsbohemia.cz/concept-zk4000_d367355.html"
];

function getFilePath(screenshotsDir, url) {
  const { host } = new URL(url);
  return path.join(screenshotsDir, `${host}.png`);
}

function prepareDir(screenshotsDir) {
  if (fs.existsSync(screenshotsDir))
    fs.rmdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(screenshotsDir);
}

async function main(puppeteer) {
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
      "--lang=cs-CZ,cs"
    ],
    defaultViewport: {
      width: 1920,
      height: 1200
    }
  });
  const page = await browser.newPage();
  const screenshotsDir = path.resolve("./screenshots");
  prepareDir(screenshotsDir);
  for (const url of urlSet) {
    try {
      console.log(`Taking screenshot of ${url}`);
      await page.goto(url);
      await page.waitForSelector("[data-hs]", { timeout: 10000 });
      await page.screenshot({
        path: getFilePath(screenshotsDir, url),
        fullPage: true
      });
    } catch (err) {
      console.warn(err);
    }
  }
  await browser.close();
}

main(puppeteer).catch(ex => {
  console.error(ex);
  return process.exit(1);
});
