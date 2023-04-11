import { QueryCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import Rollbar from "../../rollbar.mjs";

/** @typedef {import("aws-lambda").DynamoDBStreamEvent} DynamoDBStreamEvent */

const rollbar = Rollbar.init({ lambdaName: "notify-lower-actors-results" });

const db = new DynamoDBClient({});

/**
 * @param {DynamoDBStreamEvent} event
 * @returns {Promise<void>}
 */
async function handleStreamEvent(event) {
  for (const record of event.Records) {
    const { shop, count } = record.dynamodb.NewImage;
    const yesterday = new Date(new Date() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const lastItem = await db.send(
      new QueryCommand({
        TableName: "daily_shop_items_count",
        KeyConditionExpression: "shop = :shop AND #date <= :date",
        ExpressionAttributeNames: {
          "#date": "date"
        },
        ExpressionAttributeValues: {
          ":shop": shop,
          ":date": { S: yesterday }
        },
        ScanIndexForward: false,
        Limit: 1
      })
    );
    if (lastItem.Items.length > 0) {
      const lastCount = Number(lastItem.Items[0].count.N);
      const newCount = Number(count.N);
      if (newCount < lastCount * 0.85) {
        rollbar.error(
          `Shop ${shop.S} has less items than yesterday! (Old: ${lastCount} New: ${newCount})`
        );
      } else {
        console.log(`Shop ${shop.S}, old: ${lastCount} new: ${newCount})`);
      }
    } else {
      rollbar.warn(`Shop ${shop.S} no previous items count found.`);
    }
  }
}

export const handler = rollbar.lambdaHandler(handleStreamEvent);

/*
AWS_PROFILE=hlidac-shopu node src/lambda/dynamodb/notify-lower-actors-results.mjs

await handleStreamEvent({
  Records: [
    {
      dynamodb: {
        NewImage: {
          shop: { S: "mountfield_cz" },
          count: { N: "1234" },
          date: { S: "2023-04-12" }
        }
      }
    }
  ]
});
*/
