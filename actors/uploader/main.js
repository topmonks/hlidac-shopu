const Apify = require("apify");
const byteSize = require("byte-size");
const { gzip } = require("node-gzip");
const { writeToBuffer, writeToString } = require("@fast-csv/format");
const addMinutes = require("date-fns/addMinutes");
const format = require("date-fns/format");

const { keboolaUploader } = require("./src/uploader");
const { mironetValidator } = require("./src/validators/mironetValidator");
const { rohlikValidator } = require("./src/validators/rohlikValidator");
const {
  rohlikDetailValidator
} = require("./src/validators/rohlikDetailValidator");
const { tsbohemiaValidator } = require("./src/validators/tsbohemiaValidator");
const { notinoValidator } = require("./src/validators/notinoValidator");
const { datartValidator } = require("./src/validators/datartValidator");
const { itescoValidator } = require("./src/validators/itescoValidator");
const {
  itescoDetailValidator
} = require("./src/validators/itescoDetailValidator");
const { kosikValidator } = require("./src/validators/kosikValidator");
const {
  kosikDetailValidator
} = require("./src/validators/kosikDetailValidator");
const { alzaValidator } = require("./src/validators/alzaValidator");
const { czcValidator } = require("./src/validators/czcValidator");
const { mallValidator } = require("./src/validators/mallValidator");
const { mountfieldValidator } = require("./src/validators/mountfieldValidator");
const { lekarnaValidator } = require("./src/validators/lekarnaValidator");
const { kasaczValidator } = require("./src/validators/kasaczValidator");
const { kasaczValidatorBf } = require("./src/validators/kasaczValidatorBf");
const { datartValidatorBf } = require("./src/validators/datartValidatorBf");
const { slekyczValidator } = require("./src/validators/slekyczValidator");
const { pilulkaczValidator } = require("./src/validators/pilulkaczValidator");
const { benuczValidator } = require("./src/validators/benuczValidator");
const {
  prozdraviczValidator
} = require("./src/validators/prozdraviczValidator");
const { aaaautoValidator } = require("./src/validators/aaaautoValidator");
const { obiValidator } = require("./src/validators/obiValidator");
const { okayValidator } = require("./src/validators/okayValidator");
const { globusValidator } = require("./src/validators/globusValidator");
const { coopValidator } = require("./src/validators/coopValidator");
const { makroczValidator } = require("./src/validators/makroczValidator");
const { dmValidator } = require("./src/validators/dmValidator");
const { tetaValidator } = require("./src/validators/tetaValidator");
const {
  knihydobrovsky_dailyValidator
} = require("./src/validators/knihydobrovsky_dailyValidator");
const { rozetkaValidator } = require("./src/validators/rozetkaValidator");
const { hornbachValidator } = require("./src/validators/hornbachValidator");
const {
  electroworldValidator
} = require("./src/validators/electroworldValidator");
const { lidlValidator } = require("./src/validators/lidlValidator");
const { evaValidator } = require("./src/validators/evaValidator");
const { tchiboValidator } = require("./src/validators/tchiboValidator");
const { megaknihyValidator } = require("./src/validators/megaknihyValidator");
const { ikeaValidator } = require("./src/validators/ikeaValidator");
const { dekValidator } = require("./src/validators/dekValidator");

const { KEBOOLA_BUCKET } = process.env;
let stateValues = 0;

async function getItemSlug(itemUrl) {
  const { shops, shopName } = await import("@hlidac-shopu/lib/shops.mjs");
  const url = new URL(itemUrl);
  const shop = shops.get(shopName(url));
  return shop.parse(url).itemUrl;
}

async function getShopName(url) {
  const { shopName } = await import("@hlidac-shopu/lib/shops.mjs");
  return shopName(new URL(url));
}

async function processItems(
  {
    items,
    upload,
    offset,
    datasetId,
    crawledDate,
    actRunId,
    blackFriday,
    tableName
  },
  stats
) {
  const validItems = [];
  // update the objects to be properly flatten and remove failed items
  const start = Date.now();
  for (let item of items) {
    // we can do some transformation here

    switch (tableName) {
      case "mironet":
        item = mironetValidator(item);
        break;
      case "mironet_bf":
        item = mironetValidator(item);
        break;
      case "rohlik":
        item = rohlikValidator(item);
        break;
      case "rohlik_cz_details":
        item = rohlikDetailValidator(item);
        break;
      case "tsbohemia":
      case "tsbohemia_bf":
        item = tsbohemiaValidator(item);
        break;
      case "notino":
        item = notinoValidator(item);
        break;
      case "notino_sk":
        item = notinoValidator(item);
        break;
      case "notino_bf":
        item = notinoValidator(item);
        break;
      case "datart":
        item = datartValidator(item);
        break;
      case "datart_sk":
        item = datartValidator(item);
        break;
      case "datart_bf":
        item = datartValidatorBf(item);
        break;
      case "itesco":
      case "itesco_bf":
      case "itesco_sk":
      case "itesco_sk_bf":
        item = itescoValidator(item);
        break;
      case "itesco_cz_details":
        item = itescoDetailValidator(item);
        break;
      case "kosik":
        item = kosikValidator(item);
        break;
      case "kosik_cz_details":
        item = kosikDetailValidator(item);
        break;
      case "alza":
      case "alza_sk":
      case "alza_de":
      case "alza_hu":
      case "alza_uk":
      case "alza_at":
      case "alza_cz_bf":
      case "alza_sk_bf":
        item = alzaValidator(item);
        break;
      case "czc":
        item = czcValidator(item);
        break;
      case "mall":
        item = mallValidator(item);
        break;
      case "mountfield":
        item = mountfieldValidator(item);
        break;
      case "mountfield_sk":
        item = mountfieldValidator(item);
        break;
      case "mountfield_bf":
        item = mountfieldValidator(item);
        break;
      case "lekarna_cz":
      case "lekarna_bf":
        item = lekarnaValidator(item);
        break;
      case "czc_bf":
        item = czcValidator(item);
        break;
      case "mall_bf":
        item = mallValidator(item);
        break;
      case "mall_sk":
        item = mallValidator(item);
        break;
      case "kasacz":
        item = kasaczValidator(item);
        break;
      case "kasa_bf":
        item = kasaczValidatorBf(item);
        break;
      case "kosik_bf":
        item = kosikValidator(item);
        break;
      case "sleky_cz":
        item = slekyczValidator(item);
        break;
      case "pilulka_cz":
        item = pilulkaczValidator(item);
        break;
      case "pilulka_sk":
        item = pilulkaczValidator(item);
        break;
      case "benu_cz":
      case "benu_cz_bf":
        item = benuczValidator(item);
        break;
      case "prozdravi_cz":
        item = prozdraviczValidator(item);
        break;
      case "okay_cz_bf":
        item = okayValidator(item);
        break;
      case "okay_cz":
        item = okayValidator(item);
        break;
      case "okay_sk":
        item = okayValidator(item);
        break;
      case "okay_sk_bf":
        item = okayValidator(item);
        break;
      case "globus_cz":
        item = globusValidator(item);
        break;
      case "coop_cz":
        item = coopValidator(item);
        break;
      case "makro_cz":
        item = makroczValidator(item);
        break;
      case "dm_cz":
      case "dm_sk":
      case "dm_pl":
      case "dm_hu":
      case "dm_at":
      case "dm_de":
        item = dmValidator(item);
        break;
      case "teta_cz":
      case "teta_cz_bf":
        item = tetaValidator(item);
        break;
      case "knihydobrovsky_cz":
        item = knihydobrovsky_dailyValidator(item);
        break;
      case "rozetka_ua":
        item = rozetkaValidator(item);
        break;
      case "hornbach_cz":
        item = hornbachValidator(item);
        break;
      case "electroworld_cz":
      case "electroworld_cz_bf":
        item = electroworldValidator(item);
        break;
      case "lidl_cz":
        item = lidlValidator(item);
        break;
      case "eva_cz":
        item = evaValidator(item);
        break;
      case "tchibo_cz":
      case "tchibo_sk":
      case "tchibo_de":
      case "tchibo_ch":
      case "tchibo_pl":
      case "tchibo_hu":
      case "tchibo_at":
      case "tchibo_tr":
        item = tchiboValidator(item);
        break;
      case "megaknihy_cz":
        item = megaknihyValidator(item);
        break;
      case "aaaauto_cz":
      case "aaaauto_sk":
      case "aaaauto_cz_bf":
      case "aaaauto_sk_bf":
        item = aaaautoValidator(item);
        break;
      case "obi_cz":
      case "obi_sk":
      case "obi_pl":
      case "obi_hu":
      case "obi_at":
      case "obi_de":
      case "obi_ru":
      case "obi_ch":
      case "obi-italia_it":
        item = obiValidator(item);
        break;
      case "ikea_cz":
      case "ikea_sk":
      case "ikea_pl":
      case "ikea_hu":
      case "ikea_at":
      case "ikea_de":
        item = ikeaValidator(item);
        break;
      case "dek_cz":
      case "dek_sk":
        item = dekValidator(item);
        break;
    }

    // original category in data are breadcrumbs
    if (item.category) {
      item.breadCrumbs = Array.isArray(item.category)
        ? item.category.toString()
        : item.category;
    }

    if (item["shop"] === undefined || item["shop"] === null) {
      item["shop"] =
        item.itemUrl !== null ? await getShopName(item.itemUrl) : null;
    }

    if (item["slug"] === undefined || item["slug"] === null) {
      item["slug"] =
        item.itemUrl !== null ? await getItemSlug(item.itemUrl) : null;
    }

    item.date = crawledDate;
    item.actRunId = actRunId;
    item.category = blackFriday ? 1 : 0;

    validItems.push(item);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  console.log(`Processed ${items.length} in ${elapsed}s`);

  // just to be sure that we are not sending empty CSV, it will be visible in Keboola as failed import
  if (validItems.length) {
    if (upload) {
      // create a CSV from the JSONs
      // upload it to Keboola
      console.log(await writeToString(validItems));
      await keboolaUploader(
        KEBOOLA_BUCKET ?? "in.c-black-friday",
        tableName,
        await writeToBuffer(validItems).then(x => gzip(x)),
        `${tableName}-offset-${offset}-datasetid-${datasetId}.csv`,
        true
      );
    } else {
      await Apify.pushData(validItems);
    }
    stats.uploaded += items.length;
  }

  // save state everytime we process a new chunk of data
  try {
    await Promise.all([
      Apify.setValue("STATE", stateValues),
      Apify.setValue("STATS", stats)
    ]);
  } catch (e) {
    console.log("error with saving state.");
    console.log(e);
  }
}

async function loadDatasetItems(datasetId, offset, pageLimit, test) {
  const { retry } = await import("@hlidac-shopu/lib/remoting.mjs");
  return retry(4, async () => {
    const start = Date.now();
    const currentLimit = test ? 10 : pageLimit;
    // Open a named dataset
    const dataset = await Apify.openDataset(datasetId);
    const result = await dataset.getData({
      offset,
      limit: currentLimit
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`Download of ${currentLimit} items elapsed: ${elapsed}s`);
    return result.items;
  });
}

async function loadItems(
  {
    datasetId,
    offset,
    limit,
    test,
    upload,
    actRunId,
    crawledDate,
    blackFriday,
    tableName
  },
  stats
) {
  console.log(`Downloading with offset ${offset} and limit ${limit}`);
  let tries = 20;

  while (tries > 0) {
    try {
      const newItems = await loadDatasetItems(datasetId, offset, limit, test);

      if (!newItems || newItems.length === 0) {
        // no more items
        console.log("No more items in the dataset, finishing.");
        console.log("#######################");
        console.log("Upload finished.");
        console.log(`Downloaded ${stats.downloaded}`);
        console.log(`Uploaded ${stats.uploaded}`);
        console.log("#######################");
        break;
      }

      // process items and load more
      await processItems(
        {
          items: newItems,
          upload,
          offset,
          datasetId,
          crawledDate,
          actRunId,
          blackFriday,
          tableName
        },
        stats
      );
      stats.downloaded += newItems ? newItems.length : 0;
      stateValues = offset + limit;
      offset += limit;
    } catch (error) {
      console.error(error);
      tries--;
      console.log(
        `Some problem with loading, lets give it a try. Still have ${tries}`
      );
      await Apify.utils.sleep(300);
      if (limit > 5000) {
        limit = Math.floor(limit / 2);
        console.log(`Lowered limit to ${limit}`);
      }
    }
  }
}

Apify.main(async () => {
  const input = await Apify.getValue("INPUT");
  const {
    datasetId,
    upload,
    test,
    offsetManual,
    actRunId,
    manualLimit,
    blackFriday,
    tableName
  } = input;

  const limit = manualLimit ?? 10000;

  const loadedStats = await Apify.getValue("STATS");
  const stats = loadedStats ?? {
    downloaded: 0,
    uploaded: 0
  };

  // set the offset based on the state
  const state = await Apify.getValue("STATE");
  let offset;
  if (state === null) {
    offset = offsetManual ?? 0;
  } else {
    console.log(`Loaded offset from the state: ${state}`);
    offset = state;
    stateValues = state;
  }

  // notifications
  const progressInterval = setInterval(async () => {
    const memory = await Apify.getMemoryInfo();
    const usedMemory = byteSize(memory.usedBytes);
    console.log("-------------------------------------");
    console.log(`Downloaded ${stats.downloaded}`);
    console.log(`Uploaded ${stats.uploaded}`);
    console.log(`Memory used: ${usedMemory.value} ${usedMemory.unit}`);
    console.log("-------------------------------------");
  }, 30000);

  try {
    const { retry } = await import("@hlidac-shopu/lib/remoting.mjs");
    const dataset = await retry(4, () => Apify.openDataset(datasetId));
    const { createdAt } = await dataset.getInfo();
    const crawledDate = format(addMinutes(createdAt, 1), "yyyy-MM-dd HH:mm:ss");
    console.log("Crawled", crawledDate);

    await loadItems(
      {
        datasetId,
        offset,
        limit,
        test,
        upload,
        actRunId,
        crawledDate,
        blackFriday,
        tableName
      },
      stats
    );
  } finally {
    clearInterval(progressInterval);
  }
});
