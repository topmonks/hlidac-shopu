import { Actor } from "apify";

await Actor.init();

const { main } = await import("./index.js");
await main();

await Actor.exit("DONE");
