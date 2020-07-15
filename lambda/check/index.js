const fs = require("fs");
const AWS = require("aws-sdk");
const { Shop, ShopError } = require("./shops");

const indexHtml = fs.readFileSync("index.html", { encoding: "utf-8" });
const dynamodb = new AWS.DynamoDB();

exports.handler = async (event) => {
    const params = event.queryStringParameters || {};
    console.log({ params });
    if (!params.api) {
        return {
            statusCode: 200,
            headers: {
              "Content-Type": "text/html; charset=UTF-8",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
              "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            },
            body: indexHtml,
        };
    }
    if(!params.url) {
        return {
            statusCode: 400,
            headers: {
              "Content-Type": "text/html; charset=UTF-8",
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
              "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
            },
            body: JSON.stringify({ error: "invalid url" }),
        };
    }
    
    const result = {};
    
    try {
        const shopResult = {};
        const shop = Shop.create(params, dynamodb);
        shopResult.name = shop.name();
        shopResult.itemId = shop.itemId();
        shopResult.itemUrl = shop.itemUrl();
        shopResult.metadataPkey = `${shop.name()}:${shop.itemUrl()}`;
        shopResult.pkey = await shop.pkey();
        
        result.shop = shopResult;
        result.metadata = await shop.getMetadata();
    } catch (error) {
        if (error instanceof ShopError) {
            result.error = error;
        } else {
            throw error;
        }
    }
    return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT",
          "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
        },
        body: JSON.stringify(result),
    };
};
