import { Actor, log } from "apify";

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */

const isDisabled = process.env.DISABLE_KEBOOLA_UPLOAD || process.env.TEST;

/**
 * @param {string} tableName
 * @returns {Promise<void>}
 */
export async function uploadToKeboola(tableName) {
  if (isDisabled) return;
  log.info(`Keboola: Uploading to ${tableName}`);
  /** @type {ApifyEnv} */
  const env = await Actor.getEnv();
  /** @type {ActorRun} */
  const run = await Actor.call("blackfriday/uploader", {
    datasetId: env.defaultDatasetId,
    upload: true,
    actRunId: env.actorRunId,
    tableName
  });

  log.info(`Keboola upload called: ${run.id}`, { run });
}
