import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import { Parse as unzipperParse } from "unzipper";

const bucket = "data.hlidacshopu.cz";

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
  console.log("process.env:", process.env); // TODO: remove!
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = record.s3.object.key;
    (await getZip(bucket, key))
      .pipe(unzipperParse())
      .on("entry", async entry => {
        const content = await entry.buffer().then(b => b.toString());
        const params = {
          MessageBody: JSON.stringify({
            path: entry.path,
            content
          }),
          QueueUrl: process.env.SQS_URL
        };
        sqs.sendMessage(params, (err, _data) => {
          if (err) {
            console.error("Error", err);
          }
        });
      })
      .on("finish", () => {
        console.log(`All files for ${key} have been extracted`);
      });
  }
}

// await handler({
//   Records: [
//     { s3: { bucket: { name: bucket }, object: { key: "ingest/alza.cz.zip" } } }
//   ]
// });
