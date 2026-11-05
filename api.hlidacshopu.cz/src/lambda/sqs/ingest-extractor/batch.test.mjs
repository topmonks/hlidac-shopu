import test from "ava";
import {
  byteLength,
  fitsInMessage,
  MessageBatcher,
  maxItemMessageBytes,
  maxMessageBytes,
  maxMessageItems
} from "./batch.mjs";

function item(contentBytes) {
  const payload = { path: "items/shop/1/price-history.json", content: "x".repeat(contentBytes) };
  return [payload, byteLength(JSON.stringify(payload))];
}

function collect(sizes) {
  const batcher = new MessageBatcher();
  const messages = [];
  for (const contentBytes of sizes) {
    const full = batcher.add(...item(contentBytes));
    if (full) messages.push(full);
  }
  const rest = batcher.flush();
  if (rest) messages.push(rest);
  return messages;
}

test("keeps every message under the size limit when a big item comes after smaller ones", t => {
  // the case that failed for kosik.cz: ~120KB of items followed by a bigger one
  const messages = collect([60_000, 60_000, 140_000, 100_000, 150_000]);
  for (const { items, bytes } of messages) {
    t.is(bytes, byteLength(JSON.stringify({ items })));
    t.true(bytes <= maxMessageBytes);
  }
  t.is(messages.flatMap(m => m.items).length, 5);
});

test("fills a message up to the exact size limit", t => {
  const [payload, size] = item(2000);
  const perMessage = Math.floor((maxMessageBytes - byteLength('{"items":[]}') + 1) / (size + 1));
  // the size limit has to be reached before the count limit
  t.true(perMessage < maxMessageItems);
  const messages = collect(Array(perMessage + 1).fill(2000));
  t.is(messages[0].items.length, perMessage);
  t.is(messages[0].bytes, byteLength(JSON.stringify({ items: messages[0].items })));
  t.true(messages[0].bytes <= maxMessageBytes);
  t.true(byteLength(JSON.stringify({ items: [...messages[0].items, payload] })) > maxMessageBytes);
});

test("sends an item bigger than the batch limit in a message of its own", t => {
  const messages = collect([1000, 500_000, 1000]);
  t.deepEqual(
    messages.map(m => m.items.length),
    [1, 1, 1]
  );
  t.true(messages[1].bytes > maxMessageBytes);
  t.true(messages[1].bytes <= maxItemMessageBytes);
});

test("splits messages by item count", t => {
  const messages = collect(Array(maxMessageItems * 2 + 1).fill(10));
  t.deepEqual(
    messages.map(m => m.items.length),
    [maxMessageItems, maxMessageItems, 1]
  );
});

test("keeps the item order", t => {
  const batcher = new MessageBatcher();
  const sent = [];
  for (let i = 0; i < 450; i++) {
    const full = batcher.add(i, 1000);
    if (full) sent.push(...full.items);
  }
  sent.push(...batcher.flush().items);
  t.deepEqual(
    sent,
    Array.from({ length: 450 }, (_, i) => i)
  );
});

test("flush of an empty batcher returns nothing", t => {
  t.is(new MessageBatcher().flush(), undefined);
});

test("rejects items too big for any message", t => {
  t.true(fitsInMessage(item(900_000)[1]));
  const [payload, size] = item(maxItemMessageBytes);
  t.false(fitsInMessage(size));
  const batcher = new MessageBatcher();
  t.throws(() => batcher.add(payload, size), { instanceOf: RangeError });
  t.is(batcher.flush(), undefined);
});
