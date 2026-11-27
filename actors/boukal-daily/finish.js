// Preserve partial results before reporting an incomplete crawl.
export async function finishRun({ itemCount, requestsFinished, requestsFailed, sample, upload }) {
  if (upload) await upload();
  const total = requestsFinished + requestsFailed;
  const minimumItems = sample ? 1 : 10;
  if (itemCount < minimumItems || !total || requestsFailed / total > 0.01) {
    throw new Error(
      `Incomplete scrape: ${requestsFailed}/${total} failed requests, ${itemCount} products (minimum ${minimumItems})`
    );
  }
}
