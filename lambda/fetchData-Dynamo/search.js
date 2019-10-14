const AWS = require("aws-sdk");

// test 2921524

module.exports = function search(index, itemId) {
  return new Promise((resolve, reject) => {
    AWS.config.update({region: 'eu-central-1'});
    const dynamodb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
    const queryParams = {
      TableName: "czc",
      KeyConditionExpression: "itemId = :id",
      ExpressionAttributeValues: {
        ":id": {
          S: itemId
        }
      }
    };

    dynamodb.query(queryParams, function(err, data){
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
