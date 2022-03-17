import Apify from "apify";
import { defAtom } from "@thi.ng/atom";

// TODO: make this lowes common denominator
const defaultStats = {
  urls: 0,
  items: 0,
  itemsDuplicity: 0,
  totalItems: 0,
  denied: 0,
  ok: 0
};

const inc = x => x + 1;
const dec = x => x - 1;

// TODO: stats should be in atom and updated via swap function atomically
class Stats {
  constructor(init) {
    this.stats = defAtom(init);
  }

  inc(key) {
    this.stats.swapIn(key, inc);
  }

  dec(key) {
    this.stats.swapIn(key, dec);
  }

  add(key, value) {
    this.stats.swapIn(key, x => x + value);
  }

  get() {
    return this.stats.deref();
  }

  log() {
    const stats = this.stats.deref();
    Apify.utils.log.info(`stats: ${JSON.stringify(stats)}`);
  }

  async save() {
    const stats = this.stats.deref();
    await Apify.setValue("STATS", this.get()).then(() =>
      Apify.utils.log.debug("STATS saved!")
    );
    if (stats.ok !== 0) {
      Apify.utils.log.info(
        `Denied ratio: ${(stats.denied / stats.ok) * 100} %`
      );
    }
    this.log();
  }
}

/**
 *
 * @param {function} fn
 * @param {*} init
 * @returns {Promise<Stats>}
 */
export async function withPersistedStats(fn, init) {
  const stats = (await Apify.getValue("STATS")) ?? init ?? defaultStats;
  const state = new Stats(fn(stats));
  const persistState = () => state.save();

  Apify.events.on("persistState", persistState);
  Apify.events.on("migrating", persistState);

  setInterval(() => state.log(), 20 * 1000);

  return state;
}
