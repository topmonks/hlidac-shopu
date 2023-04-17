import { S3 } from "@aws-sdk/client-s3";
import { createHash } from "crypto";
import Rollbar from "../../../rollbar.mjs";

const rollbar = Rollbar.init({ lambdaName: "ingest-uploader" });

const bucket = "data.hlidacshopu.cz";

const s3 = new S3({ region: "eu-central-1", maxAttempts: 3 });

async function readStoredHash(key) {
  try {
    const resp = await s3.headObject({
      Bucket: bucket,
      Key: key
    });
    return resp.Metadata.hash;
  } catch (e) {}
}

function uploadFile(key, body, hash) {
  console.log("Uploading file", key);
  try {
    return s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "application/json",
      Metadata: { hash }
    });
  } catch (e) {
    console.error(e);
  }
}

async function handleEvents(event, _context) {
  const uploads = [];
  for (const record of event.Records) {
    for (const item of JSON.parse(record.body).items) {
      const { content, path } = item;
      const storedHash = readStoredHash(path);
      const computedHash = createHash("md5").update(content).digest("base64");
      if ((await storedHash) !== computedHash) {
        uploads.push(uploadFile(path, content, computedHash));
      }
    }
  }
  await Promise.allSettled(uploads);
}

export const handler = rollbar.lambdaHandler(handleEvents);
