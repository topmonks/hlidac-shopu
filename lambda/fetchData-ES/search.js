const AWS = require("aws-sdk");

// test 2921524

module.exports = function search(index, itemId) {
  return new Promise((resolve, reject) => {
    const region = "eu-central-1"; // e.g. us-west-1
    const domain = "search-hlidacshopu-es-rdzlitpj3qw5nrknxhpulkfate.eu-central-1.es.amazonaws.com"; // e.g. search-domain.region.es.amazonaws.com
    const endpoint = new AWS.Endpoint(domain);
    const request = new AWS.HttpRequest(endpoint, region);

    request.method = "POST";
    request.path += index + "/_search";
    request.body = JSON.stringify({
      size: "2000",
      "_source": ["date", "currentPrice", "originalPrice"],
      query: {
        bool: {
          filter: {
            term: { itemId }
          },
        }
      },
      sort: [
        { date: { order: "asc" } }
      ]
    });
    request.headers["host"] = domain;
    request.headers["Content-Type"] = "application/json";

    //const credentials = new AWS.EnvironmentCredentials("AWS");
    //const signer = new AWS.Signers.V4(request, "es");
    //signer.addAuthorization(credentials, new Date());

    console.log(request.body);

    const client = new AWS.HttpClient();
    client.handleRequest(request, null, function(response) {
      console.log(response.statusCode + " " + response.statusMessage);
      let responseBody = "";
      response.on("data", function (chunk) {
        responseBody += chunk;
      });
      response.on("end", function (chunk) {
        resolve(JSON.parse(responseBody));
      });
    }, function(error) {
      reject(error);
    });
  });
}
