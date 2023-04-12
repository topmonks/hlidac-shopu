import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { Parse as unzipperParse } from "unzipper";
import Rollbar from "../../../rollbar.mjs";

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
  const byteLength = new TextEncoder().encode(messageBody).byteLength;
  console.log(`Enqueuing ${items.length} items with total size ${byteLength}`);
  if (byteLength > 256 * 1024) {
    rollbar.error(
      `SQS message is probably too big ${byteLength} bytes (shop URL example: ${
        items.at(-1).path
      })`
    );
  }
  buffer.push(
    sqs
      .sendMessage({
        MessageBody: messageBody,
        QueueUrl: process.env.SQS_URL
      })
      .catch(err => console.error(err))
  );
}

export async function handler(event, _context) {
  let buffer = [];
  let items = [];
  for (const record of event.Records) {
    let msgSize = 0;
    let maxMessageSize = 0;
    let count = 0;
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    console.log(`Extracting files from ${key}`);
    const zip = (await getZip(bucket, key)).pipe(unzipperParse());
    await zip
      .on("entry", async entry => {
        if (entry.type !== "File") {
          entry.autodrain();
          return;
        }
        const content = await entry.buffer().then(b => b.toString());
        count++;
        const payload = { path: entry.path, content };
        items.push(payload);
        const size = new TextEncoder().encode(
          JSON.stringify(payload)
        ).byteLength;
        msgSize += size;
        if (size > maxMessageSize) maxMessageSize = size;
        // max message msgSize is 256KB, but leave some reserve
        if (msgSize + maxMessageSize >= 225 * 1024 || items.length >= 1000) {
          enqueueMessage(buffer, items);
          items = [];
          msgSize = 0;
        }
        if (buffer.length >= 100) {
          console.log("waiting for buffer");
          await Promise.allSettled(buffer);
          buffer = [];
        }
      })
      .promise()
      .then(() =>
        console.log(
          `All files from ${key} have been extracted (${count} items). Max message size: ${maxMessageSize} bytes.`
        )
      )
      .catch(err => rollbar.error(err));
  }

  if (items.length) enqueueMessage(buffer, items);
  await Promise.allSettled(buffer);
}

/*
AWS_PROFILE=hlidac-shopu node src/lambda/sqs/ingest-extractor/index.mjs

await handler({
  Records: [
    {
      s3: {
        bucket: {
          name: "ingest.hlidacshopu.cz"
        },
        object: {
          key: "mironet.cz_pricehistory.zip"
        }
      }
    }
  ]
});
*/
