const Apify = require("apify");
const { fetch } = require("fetch-h2");
const byteSize = require("byte-size");

const { KEBOOLA_URI, KEBOOLA_KEY } = process.env;

async function keboolaUploader(bucket, table, data, fileName, isGzipped) {
  let lastError;
  for (let i = 0; i < 4; i++) {
    try {
      const start = Date.now();
      const tableId = `${bucket}.${table}`;
      const size = Buffer.byteLength(data);
      await fetch(KEBOOLA_URI, {
        method: "POST",
        headers: { "X-StorageApi-Token": KEBOOLA_KEY },
        body: JSON.stringify({
          tableId,
          incremental: 1,
          data: {
            value: data,
            options: {
              filename: isGzipped ? `${fileName}.gz` : fileName,
              contentType: isGzipped ? undefined : "text/csv"
            }
          }
        })
      });
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

module.exports = { keboolaUploader };
