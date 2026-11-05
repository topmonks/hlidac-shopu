import { Readable } from "node:stream";
import { crc32 } from "node:zlib";
import test from "ava";
import { maxItemMessageBytes } from "./batch.mjs";
import { extractZip } from "./extract.mjs";

// Builds an uncompressed zip, directories are entries with a trailing slash
function zipOf(entries) {
  const files = [];
  const directory = [];
  let offset = 0;
  for (const [name, content = ""] of entries) {
    const nameBuf = Buffer.from(name);
    const data = Buffer.from(content);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt32LE(crc32(data), 14);
    header.writeUInt32LE(data.length, 18);
    header.writeUInt32LE(data.length, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    files.push(header, nameBuf, data);
    directory.push(central, nameBuf);
    offset += header.length + nameBuf.length + data.length;
  }
  const directoryBuf = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...files, directoryBuf, end]);
}

function file(i, contentBytes = 1000) {
  return [`items/shop/${i}/price-history.json`, "x".repeat(contentBytes)];
}

function queue({ failOn = () => false } = {}) {
  const sent = [];
  const errors = [];
  let calls = 0;
  return {
    sent,
    errors,
    deps: {
      async sendMessage(body) {
        const items = JSON.parse(body).items;
        if (failOn(calls++)) throw new Error("SQS failure");
        sent.push(...items.map(item => item.path));
      },
      reportError: (...args) => errors.push(args)
    }
  };
}

const paths = entries => entries.filter(([name]) => !name.endsWith("/")).map(([name]) => name);

test("sends all files in order and skips directory entries", async t => {
  const entries = [["items/"], ...Array.from({ length: 450 }, (_, i) => file(i)), ["items/shop/"], file(450)];
  const { sent, errors, deps } = queue();
  const result = await extractZip("shop_1.zip", Readable.from([zipOf(entries)]), deps);
  t.deepEqual(sent, paths(entries));
  t.deepEqual(result, { count: 451, skipped: 0 });
  t.deepEqual(errors, []);
});

test("skips files too big for a message and reports them once", async t => {
  const entries = [file(0), file(1, maxItemMessageBytes), file(2), file(3, maxItemMessageBytes)];
  const { sent, errors, deps } = queue();
  const result = await extractZip("shop_1.zip", Readable.from([zipOf(entries)]), deps);
  t.deepEqual(sent, [entries[0][0], entries[2][0]]);
  t.deepEqual(result, { count: 2, skipped: 2 });
  t.is(errors.length, 1);
  t.regex(errors[0][0], /Skipped 2 items .* e\.g\. items\/shop\/1\//);
});

test("sends the other messages when one fails, then throws for a retry", async t => {
  // 1000 files of ~1KB make 5 messages of 200 files
  const entries = Array.from({ length: 1000 }, (_, i) => file(i));
  const { sent, errors, deps } = queue({ failOn: call => call === 1 });
  await t.throwsAsync(extractZip("shop_1.zip", Readable.from([zipOf(entries)]), deps), {
    message: /incomplete .* 200 failed to enqueue/
  });
  t.is(sent.length, 800);
  t.is(errors.length, 1);
  t.is(errors[0][1].items, 200);
});

test("throws for a retry when the download fails", async t => {
  const entries = Array.from({ length: 300 }, (_, i) => file(i));
  const zip = zipOf(entries);
  const body = new Readable({ read() {} });
  body.push(zip.subarray(0, zip.length / 2));
  setTimeout(() => body.destroy(new Error("connection reset")), 10);
  const { sent, errors, deps } = queue();
  await t.throwsAsync(extractZip("shop_1.zip", body, deps), { message: /stopped|incomplete/ });
  // the files read before the error still get sent
  t.true(sent.length > 0);
  t.deepEqual(sent, paths(entries).slice(0, sent.length));
  t.is(errors.length, 1);
  t.is(errors[0][0].message, "connection reset");
});
