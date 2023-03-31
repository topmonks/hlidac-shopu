import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { Parse as unzipperParse } from "unzipper";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";

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

export async function handler(event, _context) {
  const rollbar = Rollbar.init();

  let buffer = [];
  for (const record of event.Records) {
    let warnBadPath = false;
    let count = 0;
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    console.log(`Extracting files from ${key}`);
    const zip = (await getZip(bucket, key)).pipe(
      unzipperParse({ forceStream: true })
    );
    for await (const entry of zip) {
      if (entry.type !== "File") {
        console.log("entry.path:", entry.path); // TODO: remove!
        entry.autodrain();
        continue;
      }
      const content = await entry.buffer().then(b => b.toString());
      count++;
      let path = entry.path;
      const pathParts = entry.path.split("/");
      if (pathParts[0] !== "items") {
        if (!warnBadPath)
          console.error("Invalid paths... example:", entry.path);
        warnBadPath = true;
        path = pathParts.slice(1).join("/");
        if (!path.startsWith("items")) {
          rollbar.error("Totally invalid path... example:", entry.path);
          break;
        }
      }
      buffer.push(
        sqs
          .sendMessage({
            MessageBody: JSON.stringify({
              path,
              content
            }),
            QueueUrl: process.env.SQS_URL
          })
          .catch(err => console.error(err))
      );
      if (buffer.length >= 10000) {
        console.time("waiting");
        await Promise.allSettled(buffer);
        console.timeEnd("waiting");
        buffer = [];
      }
    }
    console.log(`All files from ${key} have been extracted (${count} items)`);
    if (warnBadPath) {
      rollbar.error(`Invalid path found for ${key}`);
    }
  }
  await Promise.allSettled(buffer);
}
