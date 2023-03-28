import { GetItemCommand, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import * as metadata from "@hlidac-shopu/lib/metadata.mjs";
import { createHash } from "crypto";
import addDays from "date-fns/esm/addDays/index.js";
import getUnixTime from "date-fns/esm/getUnixTime/index.js";
import startOfDay from "date-fns/esm/startOfDay/index.js";
import { UpdateItemCommand } from "@aws-sdk/client-dynamodb";

/** @typedef { import("@aws-sdk/client-dynamodb/DynamoDBClient").DynamoDBClient } DynamoDBClient */
/** @typedef { import("@aws-sdk/client-dynamodb/commands/GetItemCommand").GetItemCommandOutput } GetItemCommandOutput */
/** @typedef { import("@aws-sdk/client-s3/S3Client").S3Client } S3Client */
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
 *
 * @param {GetItemCommandOutput} stream
 * @returns {Promise<string>}
 */
const streamToString = stream =>
  new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });

/**
 * @param {string} shop
 * @param {string} slug
 * @returns {GetObjectCommand}
 */
async function getMetadataCommand(shop, slug) {
  return new GetObjectCommand({
    Bucket: "data.hlidacshopu.cz",
    Key: `items/${shop}/${slug}/meta.json`
  });
}

/**
 * @param {S3Client} s3Client
 * @param {string} shop
 * @param {string} itemUrl
 * @returns {Promise}
 */
export async function getMetadataFromS3(s3Client, shop, itemUrl) {
  const command = await getMetadataCommand(shop, itemUrl);
  return s3Client
    .send(command)
    .then(x => x.Body)
    .then(x => streamToString(x))
    .then(x => JSON.parse(x));
}

/**
 * @param {string} shop
 * @param {string} slug
 * @returns {GetItemCommand}
 */
export async function getHistoricalDataCommand(shop, slug) {
  return new GetObjectCommand({
    Bucket: "data.hlidacshopu.cz",
    Key: `items/${shop}/${slug}/price-history.json`
  });
}

/**
 * @param {S3Client} s3Client
 * @param {string} shop
 * @param {string} itemUrl
 * @returns {Promise}
 */
export async function getHistoricalDataFromS3(s3Client, shop, itemUrl) {
  const command = await getHistoricalDataCommand(shop, itemUrl);
  return s3Client
    .send(command)
    .then(x => x.Body)
    .then(x => streamToString(x))
    .then(x => JSON.parse(x));
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
        pkey: metadata.pkey(shop.key, shop.itemUrl),
        date: today.toISOString(),
        expirationDate: getUnixTime(addDays(today, 1)),
        data: {
          currentPrice: parseFloat(params.currentPrice ?? 0),
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
      "pkey": metadata.pkey(shop.key, shop.itemUrl),
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

function incHitCounterQuery(shop, today) {
  return new UpdateItemCommand({
    TableName: "api_hit_counter",
    Key: marshall({ shop, date: today.toISOString() }),
    ExpressionAttributeValues: marshall({ ":inc": 1 }),
    UpdateExpression: "ADD hits :inc"
  });
}

export function incHitCounter(db, shop) {
  const today = startOfDay(new Date());
  const query = incHitCounterQuery(shop, today);
  return db.send(query).catch(err => console.error(err));
}
