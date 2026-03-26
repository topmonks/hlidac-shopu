import { createHash } from "node:crypto";
import { S3 } from "@aws-sdk/client-s3";
import Rollbar from "../../../rollbar.mjs";

const rollbar = Rollbar.init({ lambdaName: "ingest-uploader" });

const bucket = "data.hlidacshopu.cz";

const s3 = new S3({ region: "eu-central-1", maxAttempts: 3 });

const CONCURRENCY_LIMIT = 10;

async function readStoredHash(key) {
  try {
    const resp = await s3.headObject({
      Bucket: bucket,
      Key: key
    });
    return resp.Metadata.hash;
  } catch (err) {
    console.warn({ key, err });
    if (![404, 503].includes(err.$metadata.httpStatusCode)) {
      rollbar.error(err);
    }
  }
}

async function uploadFile(key, body, hash) {
  console.log("Uploading file", key);
  return s3.putObject({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: "application/json",
    Metadata: { hash }
  });
}

async function processItem({ content, path }) {
  const storedHash = await readStoredHash(path);
  const computedHash = createHash("md5").update(content).digest("base64");
  if (storedHash !== computedHash) {
    await uploadFile(path, content, computedHash);
    return true;
  }
  return false;
}

async function handleEvents(event, _context) {
  const items = [];
  for (const record of event.Records) {
    const parsed = JSON.parse(record.body).items;
    console.log(`Processing ${parsed.length} records (${parsed[0].path})`);
    items.push(...parsed);
  }

  let uploaded = 0;
  let skipped = 0;

  // Process items with limited concurrency to avoid S3 throttling
  for (let i = 0; i < items.length; i += CONCURRENCY_LIMIT) {
    const batch = items.slice(i, i + CONCURRENCY_LIMIT);
    const results = await Promise.all(batch.map(item => processItem(item)));
    for (const result of results) {
      if (result) uploaded++;
      else skipped++;
    }
  }
  console.log(`Done: ${uploaded} uploaded, ${skipped} skipped (unchanged), ${items.length} total`);
}

export const handler = rollbar.lambdaHandler(handleEvents);
