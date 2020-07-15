const AWS = require("aws-sdk");
const zlib = require('zlib');
const logger = require("./lib/logger");
const { Shop, ShopError } = require("./shops.js");

const dynamodb = new AWS.DynamoDB();

function gunzip(gzipData) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(gzipData, (error, data) => {
      if (error) return reject(error);
      resolve(data);
    });
  });
}

exports.handler = async(event) => {
  const shop = Shop.create(event.queryStringParameters, dynamodb);
  logger({ type: "query", event: "start", params: event.queryStringParameters, shop: shop.name() });

  let p_key;
  try {
    p_key = await shop.pkey();
  }
  catch (error) {
    if (error instanceof ShopError) {
      const { name, message, stack } = error;
      logger.error({ type: "ShopError", name, message, stack, text: error.toString() });
      logger({
        type: "query",
        event: "data-not-found",
        message,
        pkey: p_key,
        itemId: shop.itemId(),
        itemUrl: shop.itemUrl(),
        shop: shop.name(),
        metadata: shop.metadata,
        params: shop.params,
      });
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
          "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        },
        body: `{"data":[],"metadata":{ "error": "${message}"}}`
      };
    }
    throw error;
  }

  const res = await dynamodb.getItem({
    Key: {
      "p_key": {
        S: p_key
      },
    },
    TableName: "all_shops_gzip",
  }).promise();

  const foundData = Boolean(res.Item);
  const itemData = AWS.DynamoDB.Converter.unmarshall(res.Item);
  const data = itemData.json ? await gunzip(itemData.json) : "[]";

  if (!itemData.json) {
    logger({
      type: "query",
      event: "empty-data",
      pkey: p_key,
      itemId: shop.itemId(),
      itemUrl: shop.itemUrl(),
      shop: shop.name(),
      metadata: shop.metadata,
      params: shop.params,
    });
  }

  try {
    if (shop.metadata || event.queryStringParameters.metadata === "1") {
      await shop.getMetadata();
    }
  }
  catch (error) {
    if (!(error instanceof ShopError)) throw error;
    const { name, message, stack } = error;
    logger.error({ type: "error", name, message, stack, text: error.toString() });
    logger({
      type: "query",
      event: "metadata-not-found",
      message,
      pkey: p_key,
      itemId: shop.itemId(),
      itemUrl: shop.itemUrl(),
      shop: shop.name(),
      metadata: shop.metadata,
      params: shop.params,
    });
  }

  const body = `{"data":${data},"metadata":${JSON.stringify(shop.metadata || {})}}`;

  return {
    statusCode: foundData ? 200 : 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    },
    body,
  };
};

