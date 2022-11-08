import Apify, { Actor, KeyValueStore } from "apify";
import { ActorType } from "@hlidac-shopu/actors-common/actor-type.js";
import Rollbar from "@hlidac-shopu/actors-common/rollbar.js";
import { BasicCrawler } from "@crawlee/basic";

async function main() {
  const rollbar = Rollbar.init();
  const input = (await KeyValueStore.getInput()) ?? {};

  const {
    country = "CZ",
    maxConcurrency = 10,
    proxyGroups = ["CZECH_LUMINATI"],
    type = ActorType.BF,
    urls = []
  } = input;

  const requestQueue = await Actor.openRequestQueue();
  const proxyConfiguration = await Actor.createProxyConfiguration({
    groups: proxyGroups
  });

  const crawler = new BasicCrawler();
}

await Actor.main(main, { statusMessage: "DONE" });
