const utils = require("utils");

const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB();

const formattedDate = utils.getFormattedPreviousDate(1).toString();

//const formatedDate = "2020-09-28";
console.log("formatedDate=", formattedDate);

let cachedData = null;
let cachedDate = null;

exports.handler = async event => {
  if (cachedDate !== formattedDate) {
    cachedData = null;
  }

  if (!cachedData) {
    const res = await dynamodb
      .getItem({
        Key: {
          pkey: { S: formattedDate }
        },
        TableName: "topslevy_perc_discount_daily"
      })
      .promise();

    console.log("resp", res);
    if (!res.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods":
            "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
          "Access-Control-Allow-Headers":
            "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token"
        },
        body: JSON.stringify({ error: "Data not found" })
      };
    }
    cachedData = res.Item.json.S;
  }

  cachedDate = formattedDate;

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
      "Access-Control-Allow-Headers":
        "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token"
    },
    body: cachedData
  };
};
