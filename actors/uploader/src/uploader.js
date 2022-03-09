import { fetch } from "@adobe/helix-fetch";
import Apify from "apify";
import byteSize from "byte-size";
import { FormData } from "formdata-node";

const { KEBOOLA_URI, KEBOOLA_KEY } = process.env;

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
        headers: { "X-StorageApi-Token": KEBOOLA_KEY },
        body
      });
      console.log(`HTTP ${resp.status}`);
      if (!resp.ok) {
        const { message } = await resp.json();
        throw new Error(message);
      }
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      const { value, unit } = byteSize(size);
      console.log(`Uploaded ${value}${unit} to ${tableId} in ${elapsed}s.`);
      return;
    } catch (e) {
      lastError = e;
      console.log(
        `Upload to Keboola failed on ${i + 1} try, will wait awhile...`
      );
      console.log(e.message);
      await Apify.utils.sleep((i + 1) * 10 * 1000);
      await Apify.setValue("debugFile.csv", data, {
        contentType: "text/csv"
      });
    }
  }

  if (lastError) {
    console.error(lastError);
    process.exit(1);
  }
}
