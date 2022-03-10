import Apify from "apify";

// TODO: make this lowes common denominator
const defaultStats = {
  urls: 0,
  items: 0,
  itemsDuplicity: 0,
  totalItems: 0
};

export async function withPersistedStats(fn, init) {
  const stats = (await Apify.getValue("STATS")) ?? init ?? defaultStats;

  async function persistState() {
    await Apify.setValue("STATS", stats);
    Apify.utils.log.info(JSON.stringify(stats));
  }

  Apify.events.on("persistState", persistState);
  Object.defineProperty(stats, "save", {
    value: persistState
  });

  return fn(stats);
}
