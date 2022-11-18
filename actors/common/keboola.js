import { Actor, log as parentLog } from "apify";

/** @typedef { import("apify").ApifyEnv } ApifyEnv */
/** @typedef { import("apify").ActorRun } ActorRun */

const isDisabled = process.env.DISABLE_KEBOOLA_UPLOAD || process.env.TEST;
const log = parentLog.child({ prefix: "Keboola" });

/**
 * @param {string} tableName
 * @returns {Promise<void>}
 */
export async function uploadToKeboola(tableName) {
  if (isDisabled) return;
  log.info(`Uploading to table ${tableName}`);
  /** @type {ApifyEnv} */
  const env = await Actor.getEnv();
  /** @type {ActorRun} */
  const run = await Actor.call("blackfriday/uploader", {
    datasetId: env.defaultDatasetId,
    upload: true,
    actRunId: env.actorRunId,
    tableName
  });

  log.info(
    `upload ${run.status}: https://console.apify.com/organization/${run.userId}/actors/${run.actId}/runs/${run.id}#log`,
    { run }
  );
  if (run.status === "FAILED") throw new Error("Upload failed");
}
