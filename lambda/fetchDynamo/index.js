const AWS = require("aws-sdk");
const { Shop, ShopError } = require("./shops.js");

const dynamodb = new AWS.DynamoDB();

exports.handler = async(event) => {
  const shop = Shop.create(event.queryStringParameters, dynamodb);

  let p_key;
  try {
    p_key = await shop.pkey();
  } catch (error) {
    if (error instanceof ShopError) {
      const { name, message, stack } = error;
      console.log({ type: "ShopError", name, message, stack, text: error.toString() });
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
    TableName: "all_shops",
  }).promise();

  console.log({ name: shop.name(), p_key, dynamoReult: res });

  const foundData = Boolean(res.Item);
  const data = foundData ? res.Item.json.S : "[]";

  try {
    if (shop.metadata || event.queryStringParameters.metadata === "1") {
      await shop.getMetadata();
    }
  } catch (error) {
    if (!(error instanceof ShopError)) throw error;
    const { name, message, stack } = error;
    console.log({ type: "error", name, message, stack, text: error.toString() });
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
