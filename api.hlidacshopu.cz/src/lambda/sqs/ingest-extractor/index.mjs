import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { Parse as unzipperParse } from "unzipper";

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
  buffer.push(
    sqs
      .sendMessage({
        MessageBody: JSON.stringify({ items }),
        QueueUrl: process.env.SQS_URL
      })
      .catch(err => console.error(err))
  );
}

export async function handler(event, _context) {
  let buffer = [];
  let items = [];
  for (const record of event.Records) {
    let count = 0;
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    console.log(`Extracting files from ${key}`);
    const zip = (await getZip(bucket, key)).pipe(
      unzipperParse({ forceStream: true })
    );
    for await (const entry of zip) {
      if (entry.type !== "File") {
        entry.autodrain();
        continue;
      }
      const content = await entry.buffer().then(b => b.toString());
      count++;
      items.push({ path: entry.path, content });
      if (items.length >= 10) {
        enqueueMessage(buffer, items);
        items = [];
      }
      if (buffer.length >= 10000) {
        console.time("waiting");
        await Promise.allSettled(buffer);
        console.timeEnd("waiting");
        buffer = [];
      }
    }
    console.log(`All files from ${key} have been extracted (${count} items)`);
  }

  if (items.length) enqueueMessage(buffer, items);
  await Promise.allSettled(buffer);
}
