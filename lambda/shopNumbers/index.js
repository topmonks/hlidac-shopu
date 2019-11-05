const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();

const cachedData = null;

exports.handler = async(event) => {
  const res = await dynamodb.getItem({
    Key: {
      "pkey": { S: "shopNumbers" },
    },
    TableName: "all_shops_stats",
  }).promise();

  if (!res.Item) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
        "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
      },
      body: JSON.stringify({ error: "Data not found" }),
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
    },
    body: res.Item.json.S,
  };
};
