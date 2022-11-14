import { fetch } from "@adobe/helix-fetch";
import { program } from "commander/esm.mjs";

const tableTypes = new Map([
  [
    "daily",
    {
      data: '"itemId"',
      primaryKey: "itemId"
    }
  ],
  [
    "detail",
    {
      data: '"identifier"',
      primaryKey: "identifier"
    }
  ]
]);

async function createNewTable(bucket, table, type, token) {
  const resp = await fetch(
    `https://connection.keboola.com/v2/storage/buckets/${bucket}/tables`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-StorageApi-Token": token
      },
      body: JSON.stringify({
        name: table,
        ...tableTypes.get(type)
      })
    }
  );
  if (resp.ok) {
    return resp.json();
  }
  console.error(resp.error);
}

function main(tableName, options) {}

program
  .arguments("<actor-name>")
  .option("--type <type>", "type of the actor [daily, detail]")
  .option("-t, --token <token>", "API Token")
  .action(main)
  .parse(process.argv);
