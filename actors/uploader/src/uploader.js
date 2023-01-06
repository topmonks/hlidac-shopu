import { sleep } from "@crawlee/utils";
import { Actor, log } from "apify";
import byteSize from "byte-size";
import { fetch } from "fetch-h2";
import FormData from "form-data";

const { KEBOOLA_URI, KEBOOLA_KEY } = process.env;

/**
 *
 * @param {string} bucket
 * @param {string} table
 * @param {Buffer} data
 * @param {string}fileName
 * @param {boolean} isGzipped
 * @returns {Promise<void>}
 */
export async function keboolaUploader(
  bucket,
  table,
  data,
  fileName,
  isGzipped
) {
  let lastError;
  for (let i = 0; i < 4; i++) {
    try {
      const start = Date.now();
      const tableId = `${bucket}.${table}`;
      const size = Buffer.byteLength(data);

      const body = new FormData();
      body.append("tableId", tableId);
      body.append("data", data, {
        filename: isGzipped ? `${fileName}.gz` : fileName,
        contentType: isGzipped ? undefined : "text/csv"
      });
      body.append("incremental", 1);

      const resp = await fetch(KEBOOLA_URI, {
        method: "POST",
        headers: body.getHeaders({ "X-StorageApi-Token": KEBOOLA_KEY }),
        body
      });
      log.info(`HTTP ${resp.status}`);
      if (!resp.ok) {
        const { message } = await resp.json();
        throw new Error(message);
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      const { value, unit } = byteSize(size);
      log.info(`Uploaded ${value}${unit} to ${tableId} in ${elapsed}s.`);
      return;
    } catch (err) {
      lastError = err;
      log.error(
        `Upload to Keboola failed on ${i + 1} try, will wait awhile...`,
        err
      );
      await sleep((i + 1) * 10 * 1000);
      await Actor.setValue(`debugFile.csv${isGzipped ? ".gz" : ""}`, data, {
        contentType: "text/csv"
      });
    }
  }

  if (lastError) {
    console.error(lastError);
    process.exit(1);
  }
}
