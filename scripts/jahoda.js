const fs = require("fs");
const { dirname } = require("path");
const puppeteer = require("puppeteer");

const urlSet = [
  "https://www.alza.cz/screenshield-motorola-moto-g7-power-xt1955-4-na-displej-d5600645.htm",
  "https://www.alza.cz/gaming/super-mario-odyssey-nintendo-switch-d4798849.htm",
  "https://www.datart.cz/Mobilni-telefon-APPLE-iPhone-6s-32GB-Space-Grey.html",
  "https://nakup.itesco.cz/groceries/en-GB/products/2001120713178",
  "https://www.kasa.cz/televize-samsung-ue50ru7472-stribrna/?recommender_box_placement=homepage_recommended&recommender_box=quarticon",
  "https://www.mall.cz/reproduktory-tablety/lamax-sentinel2",
  "https://www.kosik.cz/produkt/vitalbite-polomekke-krouzky-pro-dospele-psy-bohate-na-hovezi",
  "https://www.lekarna.cz/vibovit-imunity-jelly-50/",
  "https://www.mironet.cz/hp-pavilion-15bc501nc-cerna-156quot-fhd-intel-core-i59300h-24ghz-8gb-1tb128gb-ssd-geforce-gtx-1050-3gb-w10+dp398400/",
  "https://www.mountfield.cz/solarni-sprcha-easy-3bpz0140",
  "https://www.notino.cz/yves-saint-laurent/la-nuit-de-lhomme-eau-electrique-toaletni-voda-pro-muze/p-650890/",
  "https://www.rohlik.cz/1350987-windsor-jeleni-maso-na-gulas",
  "https://www.tsbohemia.cz/elektricke-auto-mini-cooper-cabrio_d287643.html"
];

async function main(puppeteer) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  for (const url of urlSet) {
    await page.goto(url);
    const path = url.replace("https://", "./screenshots/") + ".png";
    fs.mkdirSync(dirname(path), { recursive: true });
    await page.screenshot({ path }).catch(() => {});
  }
  await browser.close();
}

main(puppeteer);
