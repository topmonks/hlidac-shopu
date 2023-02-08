import { Actor, log as parentLog } from "apify";
import { defAtom } from "@thi.ng/atom";

const log = parentLog.child({ prefix: "Stats" });

// TODO: make this lowest common denominator
const defaultStats = {
  urls: 0,
  items: 0,
  itemsDuplicity: 0,
  totalItems: 0,
  denied: 0,
  ok: 0,
  failed: 0
};

const inc = (x = 0) => x + 1;
const dec = (x = 0) => x - 1;

export class Stats {
  constructor(init) {
    this.stats = defAtom(init);
    this.interval = setInterval(() => this.log(), 20_000);
  }

  inc(key) {
    this.stats.swapIn(key, inc);
  }

  dec(key) {
    this.stats.swapIn(key, dec);
  }

  add(key, value) {
    this.stats.swapIn(key, (x = 0) => x + value);
  }

  get() {
    return this.stats.deref();
  }

  log() {
    const stats = this.stats.deref();
    log.info(`current`, stats);
  }

  /**
   * @param final {boolean} - If true, clearInterval apply
   */
  async save(final = false) {
    if (final) {
      clearInterval(this.interval);
    }
    const stats = this.stats.deref();
    await Actor.setValue("STATS", this.get());
    log.info("saved");
    if (stats.ok) {
      log.info(`Denied ratio: ${(stats.denied ?? 0 / stats.ok) * 100} %`);
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
  const stats = (await Actor.getValue("STATS")) ?? init ?? defaultStats;
  const state = new Stats(fn(stats));
  const persistState = () => state.save();

  Actor.on("persistState", persistState);
  Actor.on("migrating", persistState);

  return state;
}
