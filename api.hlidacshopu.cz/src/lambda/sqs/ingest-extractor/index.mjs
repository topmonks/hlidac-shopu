import { S3 } from "@aws-sdk/client-s3";
import { SQS } from "@aws-sdk/client-sqs";
import Rollbar from "../../../rollbar.mjs";
import { extractZip } from "./extract.mjs";

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

async function handleEvents(event, _context) {
  for (const record of event.Records) {
    const key = record.s3.object.key;
    const body = await getZip(record.s3.bucket.name, key);
    await extractZip(key, body, {
      sendMessage: MessageBody => sqs.sendMessage({ MessageBody, QueueUrl: process.env.SQS_URL }),
      reportError: (...args) => rollbar.error(...args)
    });
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
