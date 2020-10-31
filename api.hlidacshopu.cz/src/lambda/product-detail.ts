import { DynamoDB } from "aws-sdk";
import { createHash } from "crypto";

export function pkey(name: string, itemId: string) {
  return createHash("md5").update(`${name}${itemId}`).digest("hex");
}

export function metadataPkey(name: string, itemUrl: string) {
  return `${name}:${itemUrl}`;
}

function getMetadataQuery(
  name: string,
  itemUrl: string,
  itemId: string | null | undefined
) {
  const dbParams: DynamoDB.DocumentClient.QueryInput = {
    ExpressionAttributeValues: {
      ":pkey": metadataPkey(name, itemUrl)
    },
    KeyConditionExpression: "pkey = :pkey",
    TableName: "all_shops_metadata"
  };

  if (itemId) {
    Object.assign(dbParams.ExpressionAttributeValues, {
      ":itemId": itemId
    });
    dbParams.KeyConditionExpression = "itemId = :itemId AND pkey = :pkey";
  }
  return dbParams;
}

export async function getMetadata(
  db: DynamoDB.DocumentClient,
  name: string,
  itemUrl: string,
  itemId?: string | null
) {
  const query = getMetadataQuery(name, itemUrl, itemId);
  return db
    .query(query)
    .promise()
    .then(x => x.Items?.[0]);
}

export function getHistoricalDataQuery(name: string, itemId: string) {
  return {
    Key: { "p_key": pkey(name, itemId) },
    TableName: "all_shops"
  };
}

export function getHistoricalData(
  db: DynamoDB.DocumentClient,
  name: string,
  itemId: string
) {
  const query = getHistoricalDataQuery(name, itemId);
  return db
    .get(query)
    .promise()
    .then(x => x.Item);
}
