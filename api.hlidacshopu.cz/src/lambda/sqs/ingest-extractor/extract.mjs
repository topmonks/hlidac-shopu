import { pipeline } from "node:stream";
import { Parse as unzipperParse } from "unzipper";
import { byteLength, fitsInMessage, MessageBatcher } from "./batch.mjs";

// How many messages are sent at once before waiting for them
const maxPendingMessages = 100;

/**
 * Sends the files from the zip to the ingest queue in batches. One failed
 * message doesn't stop the rest, but the extraction then throws, so S3 invokes
 * the extractor again for the whole zip (the uploader skips unchanged files).
 *
 * @param {string} key S3 key of the zip, for logs
 * @param {import("node:stream").Readable} body the zip
 * @param {object} deps
 * @param {(messageBody: string) => Promise<unknown>} deps.sendMessage
 * @param {(...args: any[]) => void} deps.reportError
 * @returns {Promise<{ count: number, skipped: number }>}
 */
export async function extractZip(key, body, { sendMessage, reportError }) {
  const pending = [];
  const batcher = new MessageBatcher();
  let count = 0;
  let skipped = 0;
  let firstSkipped;
  let failed = 0;
  let maxItemSize = 0;
  let maxMessageSize = 0;
  let stopped = false;
  let prematureClose = false;

  function enqueue({ items, bytes }) {
    console.log(`Enqueuing ${items.length} items with total size ${bytes}`);
    if (bytes > maxMessageSize) maxMessageSize = bytes;
    pending.push(
      sendMessage(JSON.stringify({ items })).then(
        () => 0,
        e => {
          reportError(e, { items: items.length, firstPath: items[0].path });
          return items.length;
        }
      )
    );
  }

  async function sendPending() {
    const results = await Promise.all(pending.splice(0));
    failed += results.reduce((sum, n) => sum + n, 0);
  }

  console.log(`Extracting files from ${key}`);
  const zip = unzipperParse({ forceStream: true });
  // Unlike pipe(), pipeline passes a download error to the parser, so the loop below
  // throws. A file being read when it happens never ends, so its read is failed too,
  // through a reject that only lives as long as that read.
  let failRead;
  let readAll = false;
  pipeline(body, zip, e => {
    if (!e) return;
    if (readAll) console.warn(`Reading ${key} failed after its last file`, e);
    else failRead?.(e);
  });
  try {
    for await (const entry of zip) {
      if (entry.type !== "File") {
        entry.autodrain();
        continue;
      }
      const content = await new Promise((resolve, reject) => {
        failRead = reject;
        entry.buffer().then(resolve, reject);
      }).then(b => b.toString());
      const payload = { path: entry.path, content };
      const size = byteLength(JSON.stringify(payload));
      if (size > maxItemSize) maxItemSize = size;
      if (!fitsInMessage(size)) {
        skipped++;
        firstSkipped ??= entry.path;
        continue;
      }
      count++;
      const full = batcher.add(payload, size);
      if (full) enqueue(full);
      if (pending.length >= maxPendingMessages) {
        console.log("waiting for buffer");
        await sendPending();
      }
    }
    readAll = true;
  } catch (e) {
    // till https://github.com/ZJONSSON/node-unzipper/issues/228 is fixed
    if (e.message?.includes("Premature close")) {
      console.warn("Ignoring error", e);
      prematureClose = true;
    } else {
      stopped = true;
      reportError(e);
    }
  }
  const rest = batcher.flush();
  if (rest) enqueue(rest);
  await sendPending();

  if (skipped) {
    reportError(`Skipped ${skipped} items from ${key} too big for an SQS message, e.g. ${firstSkipped}`);
  }
  const summary =
    `${count} items, ${skipped} skipped, ${failed} failed to enqueue. ` +
    `Max item size: ${maxItemSize} bytes, max message size: ${maxMessageSize} bytes`;
  if (stopped) {
    console.error(`Extracting files from ${key} stopped on an error (${summary}).`);
  } else if (prematureClose) {
    console.warn(`Extracting files from ${key} ended with a premature close, the zip may be incomplete (${summary}).`);
  } else {
    console.log(`All files from ${key} have been extracted (${summary}).`);
  }
  if (stopped || failed) {
    throw new Error(`Extracting files from ${key} is incomplete (${summary})`);
  }
  return { count, skipped };
}
