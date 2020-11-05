const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const pathToExtension = path.resolve("./extension");

const urlSet = [
  "https://www.aaaauto.cz/cz/mercedes-c/car.html?id=357661795#make=75&promo=gp",
  "https://www.alza.cz/screenshield-motorola-moto-g7-power-xt1955-4-na-displej-d5600645.htm",
  "https://www.alza.cz/gaming/super-mario-odyssey-nintendo-switch-d4798849.htm",
  "https://www.benu.cz/nutrilon-3-profutura-800g-novy-baleni-3-ks",
  "https://www.datart.cz/realme-7-dualsim-8-128gb-gsm-tel-mist-white-rmx2155wh8.html",
  "https://nakup.itesco.cz/groceries/en-GB/products/2001019467158",
  "https://www.kasa.cz/televize-samsung-qe65q77ta-stribrna/",
  "https://www.mall.cz/reproduktory-tablety/lamax-sentinel2",
  "https://www.kosik.cz/produkt/vitalbite-polomekke-krouzky-pro-dospele-psy-bohate-na-hovezi",
  "https://www.lekarna.cz/vibovit-imunity-jelly-50/",
  "https://www.mironet.cz/hp-pavilion-15bc501nc-cerna-156quot-fhd-intel-core-i59300h-24ghz-8gb-1tb128gb-ssd-geforce-gtx-1050-3gb-w10+dp398400/",
  "https://www.mountfield.cz/solarni-sprcha-easy-3bpz0140",
  "https://www.notino.cz/yves-saint-laurent/la-nuit-de-lhomme-eau-electrique-toaletni-voda-pro-muze/p-650890/",
  "https://www.pilulka.cz/dettol-antibakterialni-gel-50ml",
  "https://www.prozdravi.cz/zdravi/areko-ovosan-90-kapsli.html",
  "https://www.rohlik.cz/cenove-trhaky?productPopup=1338819-gurmet-rump-steak-kvetova-spicka",
  "https://www.tsbohemia.cz/elektricke-auto-mini-cooper-cabrio_d287643.html"
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
      await page.waitForSelector("#hlidacShopu", { timeout: 10000 });
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
