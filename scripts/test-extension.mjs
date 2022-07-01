#!/usr/bin/env node
import path from "path";
import puppeteer from "puppeteer";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const pathToExtension = path.resolve(__dirname, "../extension");

const urlSet = [
  "https://www.aaaauto.cz/cz/skoda-fabia/car.html?id=441902085",
  "https://www.alza.cz/hracky/plysovy-mimozemstan-alza-novy-d4536575.htm",
  "https://www.alza.sk/hracky/plysovy-mimozemstan-alza-novy-d4536575.htm",
  "https://www.benu.cz/indulona-original-85ml",
  "https://www.czc.cz/max-vysuvny-polohovatelny-drzak-mtm9335t-pro-tv-37-70-cerna/309098/produkt",
  "https://www.datart.cz/iphone-11-64gb-white-mwlu2cn-a.html",
  "https://www.dm.cz/indulona-krem-na-ruce-original-p8586017550476.html",
  "https://www.electroworld.cz/xerox-performer-a4-80g-m2-500ks",
  "https://www.eva.cz/zbozi/DRO00845/krtek-na-odpady-900-g/",
  "https://www.hornbach.cz/p/cement-32-5-r-baleni-25-kg/5203035/",
  "https://shop.iglobus.cz/cz/globus-houska-raen-hladk-bez-posypu-60-g/1030390000006",
  "https://www.ikea.com/cz/cs/p/pokal-sklenice-cire-sklo-10270478/",
  "https://nakup.itesco.cz/groceries/cs-CZ/products/2001018827069",
  "https://www.kasa.cz/papiry-do-tiskarny-hp-office-a4-papir-80g-a4-500-listu/",
  "https://www.knihydobrovsky.cz/kniha/cesky-etymologicky-slovnik-653003",
  "https://www.kosik.cz/produkt/pekarna-brod-houska#productDescription",
  "https://www.lekarna.cz/indulona-original-85ml/",
  "https://www.lidl.cz/p/parkside-filtracni-sacky-pft-30-a1/p100338894",
  "https://www.mall.cz/telova-kosmetika/indulona-profi-unilerzal-krem-na-ruce-100-ml-100085929701",
  "https://www.mironet.cz/hp-kancelarsky-papir-business-a4-500-listu-80-gm2+dp186758/",
  "https://www.mountfield.cz/struna-nylon-line-fluo-2-4-mm-x-15m-hranata-1krz2125",
  "https://www.obi.cz/cementy-a-vapna/portlandsky-smesny-cement-cem-v-a-32-5-r/p/4887774",
  "https://www.okay.cz/products/kancelarsky-papir-xerox-astro-a4-80g-m2-500ks-bal-003r93526",
  "https://www.pilulka.cz/indulona-original-85ml",
  "https://www.prozdravi.cz/zdravi/vaha-kuchynska-digitalni-white-vk5711.html",
  "https://www.rohlik.cz/1302693-merhautovo-pekarstvi-houska-razena-bez-posypu",
  "https://www.tchibo.cz/jemna-kava-10-kapsli-p400166981.html?dim1=10Ka",
  "https://www.tchibo.cz/boxerky-5-ks-cerne-p402054064.html?dim2=01&dim1=L364",
  "https://www.tetadrogerie.cz/eshop/katalog/indulona-85ml-original",
  "https://www.tsbohemia.cz/xerox-papir-performer-a4-80g-500listu_d46562.html"
];

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
  for (const url of urlSet) {
    try {
      await page.goto(url);
      await page.waitForSelector("[data-hs]", { timeout: 10000 });
    } catch (err) {
      console.error(`Missing extension at ${url}`);
    }
  }
  await browser.close();
}

main(puppeteer).catch(ex => {
  console.error(ex);
  return process.exit(1);
});
