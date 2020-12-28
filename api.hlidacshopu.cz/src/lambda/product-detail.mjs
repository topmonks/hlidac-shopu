import { GetItemCommand } from "@aws-sdk/client-dynamodb/dist/es/commands/GetItemCommand.js";
import { QueryCommand } from "@aws-sdk/client-dynamodb/dist/es/commands/QueryCommand.js";
import { PutItemCommand } from "@aws-sdk/client-dynamodb/dist/es/commands/PutItemCommand.js";
import { marshall } from "@aws-sdk/util-dynamodb/dist/es/marshall.js";
import { unmarshall } from "@aws-sdk/util-dynamodb/dist/es/unmarshall.js";
import * as metadata from "@hlidac-shopu/lib/metadata.mjs";
import { createHash } from "crypto";
import addDays from "date-fns/esm/addDays/index.js";
import getUnixTime from "date-fns/esm/getUnixTime/index.js";
import startOfDay from "date-fns/esm/startOfDay/index.js";

/** @typedef { import("@aws-sdk/client-dynamodb/DynamoDBClient").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@hlidac-shopu/lib/shops.mjs").Shop } Shop */
/** @typedef { import("@hlidac-shopu/lib/shops.mjs").ShopParams } ShopParams */

/**
 * @param {string} name
 * @param {string} itemId
 * @returns {string}
 */
export function pkey(name, itemId) {
  return createHash("md5").update(`${name}${itemId}`).digest("hex");
}

/**
 * @param {string} name
 * @param {string} itemUrl
 * @param {string | null | undefined} itemId
 * @returns {QueryCommand}
 */
function getMetadataQuery(name, itemUrl, itemId) {
  return new QueryCommand({
    TableName: "all_shops_metadata",
    ExpressionAttributeValues: marshall({
      ":pkey": metadata.pkey(name, itemUrl),
      ...(itemId ? { ":itemId": itemId } : {})
    }),
    KeyConditionExpression:
      "pkey = :pkey" + (itemId ? " AND itemId = :itemId" : "")
  });
}

/**
 * @param {DynamoDBClient} db
 * @param {string} name
 * @param {string} itemUrl
 * @param {string | null} itemId
 * @returns {Promise}
 */
export async function getMetadata(db, name, itemUrl, itemId) {
  const query = getMetadataQuery(name, itemUrl, itemId);
  return db
    .send(query)
    .then(x => x.Items && unmarshall(x.Items[0]))
    .catch(() => ({}));
}

/**
 * @param {string} name
 * @param {string} itemId
 * @returns {GetItemCommand}
 */
export function getHistoricalDataQuery(name, itemId) {
  return new GetItemCommand({
    TableName: "all_shops",
    Key: marshall({ "p_key": pkey(name, itemId) })
  });
}

/**
 * @param {DynamoDBClient} db
 * @param {string} name
 * @param {string} itemId
 * @returns {Promise}
 */
export function getHistoricalData(db, name, itemId) {
  const query = getHistoricalDataQuery(name, itemId);
  return db
    .send(query)
    .then(x => x.Item && unmarshall(x.Item))
    .catch(() => ({}));
}

/**
 * @param {Shop} shop
 * @param {Date} today
 * @param {ShopParams} params
 * @returns {PutItemCommand}
 */
function getPutParsedDataCommand(shop, today, params) {
  return new PutItemCommand({
    TableName: "extension_parsed_data",
    Item: marshall(
      {
        pkey: metadata.pkey(shop.name, shop.itemUrl),
        date: today.toISOString(),
        expirationDate: getUnixTime(addDays(today, 1)),
        data: {
          currentPrice: parseFloat(params.currentPrice ?? "0"),
          title: params.title ?? "",
          originalPrice: params.originalPrice
            ? parseFloat(params.originalPrice)
            : "",
          imageUrl: params.imageUrl ?? ""
        }
      },
      { convertEmptyValues: true }
    )
  });
}

/**
 * @param {DynamoDBClient} db
 * @param {Shop} shop
 * @param {ShopParams} params
 * @returns {Promise}
 */
export function putParsedData(db, shop, params) {
  const today = startOfDay(new Date());
  const query = getPutParsedDataCommand(shop, today, params);
  return db.send(query);
}

/**
 * @param {Shop} shop
 * @param {Date} today
 * @returns {GetItemCommand}
 */
function getParsedDataQuery(shop, today) {
  return new GetItemCommand({
    TableName: "extension_parsed_data",
    Key: marshall({
      "pkey": metadata.pkey(shop.name, shop.itemUrl),
      "date": today.toISOString()
    })
  });
}

/**
 * @param {DynamoDBClient} db
 * @param {Shop} shop
 * @returns {Promise}
 */
export function getParsedData(db, shop) {
  const today = startOfDay(new Date());
  const query = getParsedDataQuery(shop, today);
  return db
    .send(query)
    .then(x => x.Item && unmarshall(x.Item).data)
    .catch(() => ({}));
}
