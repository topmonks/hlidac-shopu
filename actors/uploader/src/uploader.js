const Apify = require("apify");
const rp = require("request-promise");
const byteSize = require("byte-size");

const keboolaKey = process.env.KEBOOLA_KEY ?? "";

async function keboolaUploader(bucket, table, data, fileName, isGzipped) {
  let lastError;
  for (let i = 0; i < 4; i++) {
    try {
      const start = Date.now();
      const destination = `${bucket}.${table}`;
      const size = Buffer.byteLength(data);
      let options;

      if (isGzipped) {
        options = {
          value: data,
          options: {
            filename: `${fileName}.gz`
          }
        };
      } else {
        options = {
          value: data,
          options: {
            filename: fileName,
            contentType: "text/csv"
          }
        };
      }

      await rp({
        method: "POST",
        uri: process.env.KEBOOLA_URI,
        formData: {
          tableId: destination,
          incremental: 1,
          data: options
        },
        headers: {
          "X-StorageApi-Token": keboolaKey
        }
      });
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      const { value, unit } = byteSize(size);
      console.log(`Uploaded ${value}${unit} to ${destination} in ${elapsed}s.`);
      return;
    } catch (e) {
      lastError = e;
      console.log(
        `Upload to keboola failed on ${i + 1} try, will wait a while...`
      );
      console.log(e.message);
      await Apify.utils.sleep((i + 1) * 10 * 1000);
      await Apify.setValue("debugFile.csv", data, {
        contentType: "application/CSV"
      });
    }
  }

  if (lastError) {
    console.log(lastError);
    process.exit(123);
  }
}

module.exports = { keboolaUploader };
