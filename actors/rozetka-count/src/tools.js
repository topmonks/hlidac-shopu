import Apify from 'apify';
import { NAMED_KV_STORE, STATS_KEY } from './consts.js';

const { utils: { log } } = Apify;

export const purgeStatsStore = async () => {
    // const statsStore = await Apify.openKeyValueStore(NAMED_KV_STORE);
    const statsValue = await Apify.getValue(STATS_KEY);
    log.info(`statsValue: ${statsValue}`);

    // @ts-ignore
    if (statsValue === null) {
        const statsStore = await Apify.openKeyValueStore(NAMED_KV_STORE);

        await statsStore.drop();
    }
};

let isMigrating = false;
export function migrationFlagGetOrSet(value) {
    if (value === undefined) {
        return isMigrating;
    }
    else {
        isMigrating = value;
    }
}

let statsValue = 0;
export const getOrIncStatsValue = async function(inc, url) {
    if (inc !== undefined) {
        statsValue += inc;

        if (isMigrating) {
            await Apify.setValue(STATS_KEY, { value: statsValue });
        }

        if (url !== undefined) {
            log.info(`Adding ${inc} products from page '${url}'`)
        }
    }
    else {
        return statsValue;
    }
}
