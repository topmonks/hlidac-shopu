import { getValue, setValue, events, utils } from "apify";
import { defAtom } from "@thi.ng/atom";

// TODO: make this lowest common denominator
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

class Stats {
  constructor(init) {
    this.stats = defAtom(init);
    this.interval = setInterval(() => this.log(), 20 * 1000);
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
    log.info(`stats: ${JSON.stringify(stats)}`);
  }

  /**
   * @param final {boolean} - If true, clearInterval apply
   */
  async save(final = false) {
    if (final) {
      clearInterval(this.interval);
    }
    const stats = this.stats.deref();
    await setValue("STATS", this.get());
    utils.log.info("STATS saved!");
    if (stats.ok) {
      utils.log.info(`Denied ratio: ${(stats.denied ?? 0 / stats.ok) * 100} %`);
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
  const stats = (await getValue("STATS")) ?? init ?? defaultStats;
  const state = new Stats(fn(stats));
  const persistState = () => state.save();

  events.on("persistState", persistState);
  events.on("migrating", persistState);

  return state;
}
