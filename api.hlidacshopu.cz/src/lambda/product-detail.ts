import { DynamoDB } from "aws-sdk";
import { createHash } from "crypto";
import { ShopParams, Shop } from "./shops";
import { addDays, getUnixTime, startOfDay } from "date-fns";

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
  return {
    TableName: "all_shops_metadata",
    ExpressionAttributeValues: {
      ":pkey": metadataPkey(name, itemUrl),
      ...(itemId ? { ":itemId": itemId } : {})
    },
    KeyConditionExpression:
      "pkey = :pkey" + (itemId ? " AND itemId = :itemId" : "")
  };
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
    TableName: "all_shops",
    Key: { "p_key": pkey(name, itemId) }
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

export function putParsedData(
  db: DynamoDB.DocumentClient,
  shop: Shop,
  params: ShopParams
) {
  const today = startOfDay(new Date());
  return db
    .put({
      TableName: "extension_parsed_data",
      Item: {
        pkey: metadataPkey(shop.name, <string>shop.itemUrl),
        date: today.toISOString(),
        expirationDate: getUnixTime(addDays(today, 1)),
        data: {
          currentPrice: parseFloat(params.currentPrice ?? "0"),
          originalPrice:
            params.originalPrice == null
              ? null
              : parseFloat(params.originalPrice),
          title: params.title,
          imageUrl: params.imageUrl
        }
      }
    })
    .promise();
}

export function getParsedData(db: DynamoDB.DocumentClient, shop: Shop) {
  const today = startOfDay(new Date());
  return db
    .get({
      TableName: "extension_parsed_data",
      Key: {
        "pkey": metadataPkey(shop.name, <string>shop.itemUrl),
        "date": today.toISOString()
      }
    })
    .promise()
    .then(x => x.Item?.data);
}
