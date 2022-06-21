import Apify from "apify";

const { log } = Apify.utils;

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */

/**
 * @param {string} tableName
 * @returns {Promise<void>}
 */
export async function uploadToKeboola(tableName) {
  if (process.env.TEST) return;
  log.info(`Keboola: Uploading to ${tableName}`);
  /** @type {ApifyEnv} */
  const env = await Apify.getEnv();
  /** @type {ActorRun} */
  const run = await Apify.call(
    "blackfriday/uploader",
    {
      datasetId: env.defaultDatasetId,
      upload: true,
      actRunId: env.actorRunId,
      tableName
    },
    {
      waitSecs: 60
    }
  );

  log.info(`Keboola upload called: ${run.id}`, { run });
}
