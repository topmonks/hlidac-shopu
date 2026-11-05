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

function enqueueMessage(buffer, items) {
  const messageBody = JSON.stringify({ items });
  console.log(`Enqueuing ${items.length} items with total size ${byteLength(messageBody)}`);
  buffer.push(
    sqs.sendMessage({
      MessageBody: messageBody,
      QueueUrl: process.env.SQS_URL
    })
  );
}

async function handleEvents(event, _context) {
  let buffer = [];
  const batcher = new MessageBatcher();
  for (const record of event.Records) {
    let maxMessageSize = 0;
    let count = 0;
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    console.log(`Extracting files from ${key}`);
    const zip = (await getZip(bucket, key)).pipe(unzipperParse({ forceStream: true }));
    try {
      for await (const entry of zip) {
        if (entry.type !== "File") {
          entry.autodrain();
          continue;
        }
        const content = await entry.buffer().then(b => b.toString());
        count++;
        const payload = { path: entry.path, content };
        const size = byteLength(JSON.stringify(payload));
        if (size > maxMessageSize) maxMessageSize = size;
        if (!fitsInMessage(size)) {
          rollbar.error(`Skipping ${entry.path} from ${key}, ${size} bytes is too big for an SQS message`);
          continue;
        }
        const full = batcher.add(payload, size);
        if (full) enqueueMessage(buffer, full);
        if (buffer.length >= 100) {
          console.log("waiting for buffer");
          await Promise.all(buffer);
          buffer = [];
        }
      }
    } catch (e) {
      // till https://github.com/ZJONSSON/node-unzipper/issues/228 is fixed
      if (e.message.includes("Premature close")) {
        console.warn("Ignoring error", e);
      } else {
        rollbar.error(e);
      }
    }
    console.log(
      `All files from ${key} have been extracted (${count} items). Max message size: ${maxMessageSize} bytes.`
    );
  }

  const rest = batcher.flush();
  if (rest) enqueueMessage(buffer, rest);
  await Promise.all(buffer);
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
