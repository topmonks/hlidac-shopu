import AWS from "aws-sdk";
import { shops } from "@hlidac-shopu/lib/shops.mjs";
import https from "https";
import fs from "fs";

import pkg from "json-2-csv";
import path from "path";
const { json2csv } = pkg;

//Parse arguments from command line
function getArgs() {
  const args = {};
  process.argv
    .slice(2, process.argv.length)
    .forEach(arg => {
      // long arg
      if (arg.slice(0, 2) === "--") {
        const longArg = arg.split("=");
        const longArgFlag = longArg[0].slice(2, longArg[0].length);
        const longArgValue = longArg.length > 1 ? longArg[1] : true;
        args[longArgFlag] = longArgValue;
      }
      // flags
      else if (arg[0] === "-") {
        const flags = arg.slice(1, arg.length).split("");
        flags.forEach(flag => {
          args[flag] = true;
        });
      }
    });
  return args;
}
const args = getArgs();

function prepareDir(dir) {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
}

//Get all items from DynamoDB paginated to save Provisioned read capacity
const getPaginatedResults = async (fn) => {
  const EMPTY = Symbol("empty");
  const res = [];
  for await (const lf of (async function* () {
    let NextMarker = EMPTY;
    let count = 0;
    while (NextMarker || NextMarker === EMPTY) {
      const { marker, results, count: ct } =
        await fn(NextMarker !== EMPTY ? NextMarker : undefined, count);

      yield* results;

      // if there's no marker, then we reached the end
      if (!marker) {
        break;
      }

      NextMarker = marker;
      count = ct;
    }
  })()) {
    res.push(lf);
  }

  return res;
};

const config = {
  apiVersion: "latest",
  region: "eu-central-1",
  httpOptions: {
    agent: new https.Agent({ keepAlive: true })
  }
};

AWS.config.update(config);
// Create the Document Client interface for DynamoDB
const ddbDocumentClient = new AWS.DynamoDB.DocumentClient();

// use argument "from" from commandline or set current month
const now = new Date();
const currentDate = `${now.getFullYear()}-${("0" + (now.getMonth() + 1)).slice(-2)}`;
const fromDate = args.from ?? currentDate;
console.log("fromDate:", fromDate);

const dbQueryParams = {
  TableName: "api_hit_counter",
  ExpressionAttributeValues: {
    ":v1": "alza.cz", ":v2": fromDate
  },
  ExpressionAttributeNames: {
    "#shop": "shop",
    "#date": "date"
  },
  KeyConditionExpression: "#shop = :v1 AND #date >= :v2"
};
const shopHits = [];

async function queryDatabase() {
  return await getPaginatedResults(async (ExclusiveStartKey) => {
    const queryResponse = await ddbDocumentClient
      .query({ ExclusiveStartKey, ...dbQueryParams })
      .promise();
    return {
      marker: queryResponse.LastEvaluatedKey,
      results: queryResponse.Items
    };
  });
}

for (const shop of shops) {
  if (shop[0].includes(".")) {
    dbQueryParams.ExpressionAttributeValues[":v1"] = shop[0];
    shopHits.push({ name: shop[0], hits: 0 });
    const shopIndex = shopHits.length - 1;
    const items = await queryDatabase();
    for (const item of items) {
      shopHits[shopIndex].hits += item.hits;
    }
  }
}
shopHits.sort((a, b) => b.hits - a.hits);

// convert JSON to CSV string
json2csv(shopHits, (err, csv) => {
  if (err) {
    throw err;
  }
  const fileName = fromDate === currentDate ? fromDate : `${fromDate}-${currentDate}`;
  const dirPath = './scripts/stats'
  prepareDir(dirPath);
  const filePath = path.resolve(dirPath, `extension-hits-${fileName}-${Date.now()}.csv`);
  // write CSV to a file
  fs.writeFileSync(filePath, csv);
});
console.log(shopHits);
