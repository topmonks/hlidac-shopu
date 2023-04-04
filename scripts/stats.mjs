import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { shops } from "@hlidac-shopu/lib/shops.mjs";
import https from "https";
import fs from "fs";
import path from "path";

//Parse arguments from command line
function getArgs() {
  const args = {};
  process.argv.slice(2, process.argv.length).forEach(arg => {
    // long arg
    if (arg.slice(0, 2) === "--") {
      const longArg = arg.split("=");
      const longArgFlag = longArg[0].slice(2, longArg[0].length);
      args[longArgFlag] = longArg.length > 1 ? longArg[1] : true;
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
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

//Get all items from DynamoDB paginated to save Provisioned read capacity
const getPaginatedResults = async fn => {
  const EMPTY = Symbol("empty");
  const res = [];
  for await (const lf of (async function* () {
    let NextMarker = EMPTY;
    let count = 0;
    while (NextMarker || NextMarker === EMPTY) {
      const {
        marker,
        results,
        count: ct
      } = await fn(NextMarker !== EMPTY ? NextMarker : undefined, count);

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

const db = new DynamoDBClient({ region: "eu-central-1", maxAttempts: 3 });

// use argument "from" from commandline or set current month
const now = new Date();
const currentDate = `${now.getFullYear()}-${("0" + (now.getMonth() + 1)).slice(
  -2
)}`;
const fromDate = args.from ?? null;
console.log(
  "Start counting extension hits for shops from",
  fromDate ? `date: ${fromDate}` : "beginning"
);

const dbQueryParams = {
  TableName: "api_hit_counter",
  ExpressionAttributeValues: {
    ":v1": { S: "alza.cz" }
  },
  ExpressionAttributeNames: {
    "#shop": "shop"
  },
  KeyConditionExpression: "#shop = :v1"
};
if (fromDate !== null) {
  dbQueryParams.ExpressionAttributeValues[":v2"] = { S: fromDate };
  dbQueryParams.ExpressionAttributeNames["#date"] = "date";
  dbQueryParams.KeyConditionExpression = "#shop = :v1 AND #date >= :v2";
}
const shopHits = {};

async function queryDatabase() {
  return await getPaginatedResults(async ExclusiveStartKey => {
    const queryResponse = await db.send(
      new QueryCommand({ ExclusiveStartKey, ...dbQueryParams })
    );
    return {
      marker: queryResponse.LastEvaluatedKey,
      results: queryResponse.Items
    };
  });
}

for (const shop of shops) {
  if (shop[0].includes(".")) {
    dbQueryParams.ExpressionAttributeValues[":v1"] = { S: shop[0] };

    const items = await queryDatabase();
    for (const item of items) {
      //Parse date from item
      const itemDate = new Date(item.date);
      //Get month and year from date
      const itemMonth = ("0" + (itemDate.getMonth() + 1)).slice(-2);
      const itemYear = itemDate.getFullYear();
      //Create key for shopHits object
      const groupDate = `${itemYear}-${itemMonth}`;
      if (!shopHits[groupDate]) {
        shopHits[groupDate] = [];
      }
      let shopIndex = shopHits[groupDate].findIndex(x => x.name === shop[0]);
      if (shopIndex === -1) {
        shopHits[groupDate].push({ name: shop[0], hits: 0 });
        shopIndex = 0;
      }
      shopHits[groupDate][shopIndex].hits += item.hits;
    }
  }
}
//Loop every groupDate in shopHits and sort hits for each shop
for (const groupDate in shopHits) {
  shopHits[groupDate].sort((a, b) => b.hits - a.hits);
}
//Create directory for output
const dirPath = "./scripts/stats";
prepareDir(dirPath);
//Create file path
const fileDate = `${Object.keys(shopHits)[0]}-${currentDate}`;
const fileName = `extension-hits-${fileDate}-${Date.now()}.json`;
const filePath = path.resolve(dirPath, fileName);
//Write JSON to a file
fs.writeFileSync(filePath, JSON.stringify(shopHits, null, 2), "utf8");
console.log(`Done: ${filePath.toString()}`);
