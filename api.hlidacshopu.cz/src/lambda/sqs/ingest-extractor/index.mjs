import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { Parse as unzipperParse } from "unzipper";
import Rollbar from "../../../rollbar.mjs";
import { byteLength, fitsInMessage, MessageBatcher } from "./batch.mjs";

const rollbar = Rollbar.init({ lambdaName: "ingest-extractor" });

const s3 = new S3({ region: "eu-central-1", maxAttempts: 3 });
const sqs = new SQS({ region: "eu-central-1", maxAttempts: 3 });

function getZip(bucket, key) {
  return s3
    .getObject({
      Bucket: bucket,
      Key: key
    })
    .then(r => r.Body);
}

// Resolves to the number of items that failed to enqueue, so one failed message
// doesn't end the extraction as an unhandled rejection
function enqueueMessage(buffer, { items, bytes }) {
  console.log(`Enqueuing ${items.length} items with total size ${bytes}`);
  buffer.push(
    sqs
      .sendMessage({
        MessageBody: JSON.stringify({ items }),
        QueueUrl: process.env.SQS_URL
      })
      .then(
        () => 0,
        e => {
          rollbar.error(e, { items: items.length, firstPath: items[0].path });
          return items.length;
        }
      )
  );
}

async function sendBuffered(buffer) {
  const failed = await Promise.all(buffer.splice(0));
  return failed.reduce((sum, n) => sum + n, 0);
}

async function extractZip(bucket, key) {
  const buffer = [];
  const batcher = new MessageBatcher();
  const skipped = [];
  let maxMessageSize = 0;
  let count = 0;
  let failed = 0;
  let stopped = false;
  console.log(`Extracting files from ${key}`);
  const zip = (await getZip(bucket, key)).pipe(unzipperParse({ forceStream: true }));
  try {
    for await (const entry of zip) {
      if (entry.type !== "File") {
        entry.autodrain();
        continue;
      }
      const content = await entry.buffer().then(b => b.toString());
      const payload = { path: entry.path, content };
      const size = byteLength(JSON.stringify(payload));
      if (size > maxMessageSize) maxMessageSize = size;
      if (!fitsInMessage(size)) {
        skipped.push(entry.path);
        continue;
      }
      count++;
      const full = batcher.add(payload, size);
      if (full) enqueueMessage(buffer, full);
      if (buffer.length >= 100) {
        console.log("waiting for buffer");
        failed += await sendBuffered(buffer);
      }
    }
  } catch (e) {
    // till https://github.com/ZJONSSON/node-unzipper/issues/228 is fixed
    if (e.message.includes("Premature close")) {
      console.warn("Ignoring error", e);
    } else {
      stopped = true;
      rollbar.error(e);
    }
  }
  const rest = batcher.flush();
  if (rest) enqueueMessage(buffer, rest);
  failed += await sendBuffered(buffer);

  if (skipped.length) {
    rollbar.error(`Skipped ${skipped.length} items from ${key} too big for an SQS message, e.g. ${skipped[0]}`);
  }
  if (failed) {
    rollbar.error(`Failed to enqueue ${failed} items from ${key}`);
  }
  const summary = `${count} items, ${skipped.length} skipped, ${failed} failed to enqueue`;
  if (stopped) {
    console.error(`Extracting files from ${key} stopped on an error (${summary}).`);
  } else {
    console.log(`All files from ${key} have been extracted (${summary}). Max message size: ${maxMessageSize} bytes.`);
  }
}

async function handleEvents(event, _context) {
  for (const record of event.Records) {
    await extractZip(record.s3.bucket.name, record.s3.object.key);
  }
}

export const handler = rollbar.lambdaHandler(handleEvents);

/*
AWS_PROFILE=hlidac-shopu node src/lambda/sqs/ingest-extractor/index.mjs

await handleEvents({
  Records: [
    {
      s3: {
        bucket: {
          name: "ingest.hlidacshopu.cz"
        },
        object: {
          key: "siko.cz_pricehistory_1.zip"
        }
      }
    }
  ]
});
*/
