import test from "ava";
import { finishRun } from "./finish.js";

test("uploads results and tolerates at most one percent failed requests", async t => {
  let uploads = 0;
  const upload = async () => {
    uploads++;
  };
  await finishRun({ itemCount: 100, requestsFinished: 99, requestsFailed: 1, sample: false, upload });
  t.is(uploads, 1);
  await t.throwsAsync(finishRun({ itemCount: 100, requestsFinished: 98, requestsFailed: 2, sample: false, upload }));
  t.is(uploads, 2);
});

test("uploads before rejecting a sparse or empty full run", async t => {
  for (const itemCount of [0, 9]) {
    let uploaded = false;
    await t.throwsAsync(
      finishRun({
        itemCount,
        requestsFinished: 100,
        requestsFailed: 0,
        sample: false,
        upload: async () => {
          uploaded = true;
        }
      })
    );
    t.true(uploaded);
  }
  await t.notThrowsAsync(finishRun({ itemCount: 10, requestsFinished: 100, requestsFailed: 0, sample: false }));
});

test("samples accept a single product without uploading and reject empty runs", async t => {
  await t.notThrowsAsync(finishRun({ itemCount: 1, requestsFinished: 1, requestsFailed: 0, sample: true }));
  await t.throwsAsync(finishRun({ itemCount: 0, requestsFinished: 1, requestsFailed: 0, sample: true }));
  await t.throwsAsync(finishRun({ itemCount: 10, requestsFinished: 0, requestsFailed: 0, sample: false }));
});
