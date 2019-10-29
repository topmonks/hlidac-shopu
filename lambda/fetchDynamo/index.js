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
        body: "[]",
      };
    }
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

  const found = Boolean(res.Item);
  const body = found ? res.Item.json.S : "[]";

  return {
    statusCode: found ? 200 : 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    },
    body,
  };
};
