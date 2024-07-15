import { Blob } from "node:buffer";
import { setTimeout as sleep } from "node:timers/promises";
import { Actor, log } from "apify";
import byteSize from "byte-size";

const { KEBOOLA_URI, KEBOOLA_KEY } = process.env;

/**
 *
 * @param {string} bucket
 * @param {string} table
 * @param {Blob} data
 * @param {string}fileName
 * @param {boolean} isGzipped
 * @returns {Promise<void>}
 */
export async function keboolaUploader(bucket, table, data, fileName, isGzipped) {
  let lastError;
  for (let i = 0; i < 4; i++) {
    try {
      const start = Date.now();
      const tableId = `${bucket}.${table}`;
      const dataBlob = new Blob([data], { type: "application/gzip" });

      const body = new FormData();
      body.append("tableId", tableId);
      body.append("data", dataBlob, isGzipped ? `${fileName}.gz` : fileName);
      body.append("incremental", "1");

      const resp = await fetch(KEBOOLA_URI, {
        method: "POST",
        headers: {
          contentType: isGzipped ? undefined : "text/csv",
          "X-StorageApi-Token": KEBOOLA_KEY
        },
        body
      });
      log.info(`HTTP ${resp.status}`);
      if (!resp.ok) {
        const errorResponse = await resp.text();
        throw new Error(`Problem during upload to Keboola: ${errorResponse}`);
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      const { value, unit } = byteSize(dataBlob.size);
      log.info(`Uploaded ${value}${unit} to ${tableId} in ${elapsed}s.`);
      return;
    } catch (err) {
      lastError = err;
      log.exception(err, `Upload to Keboola failed on ${i + 1} try, will wait awhile...`);
      await sleep((i + 1) * 10_000);
      await Actor.setValue(`debugFile.csv${isGzipped ? ".gz" : ""}`, data, {
        contentType: "text/csv"
      }).catch(error => {
        log.exception(error, `There was a problem with storing issued data to the KV store!`);
      });
    }
  }

  if (lastError) {
    console.error(lastError);
    process.exit(1);
  }
}
