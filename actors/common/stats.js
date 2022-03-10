import Apify from "apify";

// TODO: make this lowes common denominator
const defaultStats = {
  urls: 0,
  items: 0,
  itemsDuplicity: 0,
  totalItems: 0,
  denied: 0,
  ok: 0
};

// TODO: stats should be in atom and updated via swap function atomically
/**
 *
 * @param {function(object): object} fn
 * @param {*} init
 * @returns {Promise<*>}
 */
export async function withPersistedStats(fn, init) {
  const stats = (await Apify.getValue("STATS")) ?? init ?? defaultStats;

  async function persistState() {
    await Apify.setValue("STATS", stats);
    if (stats.ok !== 0) {
      Apify.utils.log.info(
        `Denied ratio: ${(stats.denied / stats.ok) * 100} %`
      );
    }
    Apify.utils.log.info(JSON.stringify(stats));
  }

  Apify.events.on("persistState", persistState);
  Apify.events.on("migrating", persistState);

  Object.defineProperty(stats, "save", {
    value: persistState
  });

  setInterval(() => {
    Apify.utils.log.info(`stats: ${JSON.stringify(stats)}`);
  }, 20 * 1000);

  return fn(stats);
}
