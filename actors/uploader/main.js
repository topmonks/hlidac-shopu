import { getMemoryInfo, sleep } from "@crawlee/utils";
import { writeToBuffer } from "@fast-csv/format";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { retry } from "@hlidac-shopu/lib/remoting.mjs";
import { itemSlug, shopOrigin, shopName } from "@hlidac-shopu/lib/shops.mjs";
import { Actor, log } from "apify";
import byteSize from "byte-size";
import { addMinutes, format } from "date-fns";
import gzip from "node-gzip";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

import { keboolaUploader } from "./src/uploader.js";
import { mironetValidator } from "./src/validators/mironetValidator.js";
import { rohlikValidator } from "./src/validators/rohlikValidator.js";
import { rohlikDetailValidator } from "./src/validators/rohlikDetailValidator.js";
import { tsbohemiaValidator } from "./src/validators/tsbohemiaValidator.js";
import { tsbohemiaPriceValidator } from "./src/validators/tsbohemiaPriceValidator.js";
import { notinoValidator } from "./src/validators/notinoValidator.js";
import { datartValidator } from "./src/validators/datartValidator.js";
import { itescoValidator } from "./src/validators/itescoValidator.js";
import { itescoDetailValidator } from "./src/validators/itescoDetailValidator.js";
import { kosikValidator } from "./src/validators/kosikValidator.js";
import { kosikDetailValidator } from "./src/validators/kosikDetailValidator.js";
import { alzaValidator } from "./src/validators/alzaValidator.js";
import { alzaFeedValidator } from "./src/validators/alzaFeedValidator.js";
import { czcValidator } from "./src/validators/czcValidator.js";
import { mallValidator } from "./src/validators/mallValidator.js";
import { mountfieldValidator } from "./src/validators/mountfieldValidator.js";
import { lekarnaValidator } from "./src/validators/lekarnaValidator.js";
import { luxorValidator } from "./src/validators/luxoeValidator.js";
import { kasaczValidator } from "./src/validators/kasaczValidator.js";
import { kasaczValidatorBf } from "./src/validators/kasaczValidatorBf.js";
import { datartValidatorBf } from "./src/validators/datartValidatorBf.js";
import { pilulkaczValidator } from "./src/validators/pilulkaczValidator.js";
import { benuczValidator } from "./src/validators/benuczValidator.js";
import { prozdraviczValidator } from "./src/validators/prozdraviczValidator.js";
import { aaaautoValidator } from "./src/validators/aaaautoValidator.js";
import { obiValidator } from "./src/validators/obiValidator.js";
import { okayValidator } from "./src/validators/okayValidator.js";
import { globusValidator } from "./src/validators/globusValidator.js";
import { coopValidator } from "./src/validators/coopValidator.js";
import { makroczValidator } from "./src/validators/makroczValidator.js";
import { dmValidator } from "./src/validators/dmValidator.js";
import { tetaValidator } from "./src/validators/tetaValidator.js";
import { rozetkaValidator } from "./src/validators/rozetkaValidator.js";
import { hornbachValidator } from "./src/validators/hornbachValidator.js";
import { electroworldValidator } from "./src/validators/electroworldValidator.js";
import { lidlValidator } from "./src/validators/lidlValidator.js";
import { evaValidator } from "./src/validators/evaValidator.js";
import { tchiboValidator } from "./src/validators/tchiboValidator.js";
import { megaknihyValidator } from "./src/validators/megaknihyValidator.js";
import { ikeaValidator } from "./src/validators/ikeaValidator.js";
import { dekValidator } from "./src/validators/dekValidator.js";

const { KEBOOLA_BUCKET } = process.env;
let stateValues = 0;

const rollbar = Rollbar.init();

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
  for (let item of items.reverse()) {
    // we can do some transformation here
    let priceFeedOnly = false;
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
      case "tsbohemia_cz_price":
        priceFeedOnly = true;
        item = tsbohemiaPriceValidator(item);
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
      case "alza_cz_feed":
      case "alza_sk_feed":
      case "alza_de_feed":
      case "alza_hu_feed":
      case "alza_uk_feed":
      case "alza_at_feed":
        item = alzaFeedValidator(item);
        break;
      case "czc":
        item = czcValidator(item);
        break;
      case "mall":
        item = mallValidator(item);
        break;
      case "mountfield":
      case "mountfield_sk":
      case "mountfield_bf":
        item = mountfieldValidator(item);
        break;
      case "lekarna_cz":
      case "lekarna_bf":
        item = lekarnaValidator(item);
        break;
      case "luxor_cz":
        item = luxorValidator(item);
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
      case "okay_cz":
      case "okay_cz-browser":
      case "okay_sk":
      case "okay_sk-browser":
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
      case "rozetka_ua":
        item = rozetkaValidator(item);
        break;
      case "hornbach":
      case "hornbach_cz":
      case "hornbach_sk":
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

    if (!priceFeedOnly) {
      // original category in data are breadcrumbs
      if (!item.breadCrumbs) {
        if (item.category) {
          item.breadCrumbs = Array.isArray(item.category)
            ? item.category.toString()
            : item.category;
        } else if (typeof item.category === "string" && item.category === "") {
          item.breadCrumbs = "";
        }
      }

      // TODO: do it in actors
      if (!item.shop) {
        item.shop = item.itemUrl ? shopName(item.itemUrl) : null;
      }

      // TODO: do it in actors
      if (!item.shopOrigin) {
        item.shopOrigin = item.itemUrl ? shopOrigin(item.itemUrl) : null;
      }

      // TODO: do it in actors
      if (!item.slug) {
        item.slug = item.itemUrl ? itemSlug(item.itemUrl) : null;
      }
      item.category = blackFriday ? 1 : 0;
    }

    item.date = crawledDate;
    item.actRunId = actRunId;

    validItems.push(item);
  }
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);
  log.info(`Processed ${items.length} in ${elapsed}s`);

  // just to be sure that we are not sending empty CSV, it will be visible in Keboola as failed import
  if (validItems.length) {
    if (upload) {
      // create a CSV from the JSONs
      // upload it to Keboola
      await keboolaUploader(
        KEBOOLA_BUCKET ?? "in.c-black-friday",
        tableName,
        await writeToBuffer(validItems, { headers: true })
          .then(b => gzip.gzip(b))
          .then(b => new Blob([b], { type: "application/gzip" })),
        `${tableName}-offset-${offset}-datasetid-${datasetId}.csv`,
        true
      );
    } else {
      await Actor.pushData(validItems);
    }
    stats.uploaded += items.length;
  }

  // save state everytime we process a new chunk of data
  try {
    await Promise.all([
      Actor.setValue("STATE", stateValues),
      Actor.setValue("STATS", stats)
    ]);
  } catch (err) {
    log.error("error with saving state.", err);
  }
}

async function loadDatasetItems(datasetId, offset, pageLimit, test) {
  return retry(4, async () => {
    const start = Date.now();
    const currentLimit = test ? 10 : pageLimit;
    // Open a named dataset
    const dataset = await Actor.openDataset(datasetId);
    const result = await dataset.getData({
      offset,
      limit: currentLimit
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    log.info(`Download of ${currentLimit} items elapsed: ${elapsed}s`);
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
  log.info(`Downloading with offset ${offset} and limit ${limit}`);
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
      rollbar.error(error, { tableName });
      log.error(error);
      tries--;
      log.info(
        `Some problem with loading, lets give it a try. Still have ${tries}`
      );
      await sleep(300);
      if (limit > 5000) {
        limit = Math.floor(limit / 2);
        log.info(`Lowered limit to ${limit}`);
      }
    }
  }
}

async function saveItemsCount(shop, downloaded) {
  const db = new DynamoDBClient({ region: "eu-central-1", maxAttempts: 3 });
  const params = {
    TableName: "daily_shop_items_count",
    Item: {
      shop: { S: shop },
      date: { S: new Date().toISOString().split("T")[0] },
      count: { N: downloaded.toString() }
    }
  };
  await db.send(new PutItemCommand(params));
}

async function main() {
  const input = await Actor.getValue("INPUT");
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

  if (!tableName) {
    throw new Error("tableName is missing in INPUT");
  }

  const limit = manualLimit ?? 10000;

  const loadedStats = await Actor.getValue("STATS");
  const stats = loadedStats ?? {
    downloaded: 0,
    uploaded: 0
  };

  // set the offset based on the state
  const state = await Actor.getValue("STATE");
  let offset;
  if (state === null) {
    offset = offsetManual ?? 0;
  } else {
    log.info(`Loaded offset from the state: ${state}`);
    offset = state;
    stateValues = state;
  }

  // notifications
  const progressInterval = setInterval(async () => {
    const memory = await getMemoryInfo();
    const usedMemory = byteSize(memory.usedBytes);
    console.log("-------------------------------------");
    console.log(`Downloaded ${stats.downloaded}`);
    console.log(`Uploaded ${stats.uploaded}`);
    console.log(`Memory used: ${usedMemory.value} ${usedMemory.unit}`);
    console.log("-------------------------------------");
  }, 30000);

  try {
    const dataset = await retry(4, () => Actor.openDataset(datasetId));
    const { createdAt } = await dataset.getInfo();
    const crawledDate = format(addMinutes(createdAt, 1), "yyyy-MM-dd HH:mm:ss");
    log.info(`Crawled ${crawledDate}`);
    log.info(`Target table: ${tableName}`);

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
    await saveItemsCount(tableName, stats.downloaded);
  } finally {
    clearInterval(progressInterval);
  }
}

await Actor.main(main);
