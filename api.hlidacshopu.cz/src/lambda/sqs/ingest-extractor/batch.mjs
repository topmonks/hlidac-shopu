// Items are batched into messages up to this size
export const maxMessageBytes = 250 * 1024;
// The ingest queue accepts messages up to 1 MiB (see index.ts), leave some reserve,
// a bigger item is sent alone
export const maxItemMessageBytes = 1000 * 1024;
export const maxMessageItems = 200;

const encoder = new TextEncoder();

export function byteLength(text) {
  return encoder.encode(text).byteLength;
}

const envelopeBytes = byteLength(JSON.stringify({ items: [] }));

// Size of the `{"items":[...]}` message body: the items, the commas between them and the envelope
function bodyBytes(itemsBytes, count) {
  return envelopeBytes + itemsBytes + Math.max(count - 1, 0);
}

/**
 * @param {number} size byte length of the item serialized to JSON
 * @returns {boolean} whether a message with only this item fits the queue limit
 */
export function fitsInMessage(size) {
  return bodyBytes(size, 1) <= maxItemMessageBytes;
}

/**
 * @typedef {object} Message
 * @property {any[]} items
 * @property {number} bytes byte length of the `{"items":[...]}` message body
 */

/**
 * Groups items into SQS messages under the size and count limits. The size is
 * checked before an item is added, so one big item can't push a message over
 * the limit.
 */
export class MessageBatcher {
  #items = [];
  #bytes = 0;

  /**
   * @param {any} item
   * @param {number} size byte length of the item serialized to JSON
   * @returns {Message|undefined} the previous message, when the new item didn't fit into it
   * @throws {RangeError} when the item doesn't fit even into a message of its own
   */
  add(item, size) {
    if (!fitsInMessage(size)) throw new RangeError(`Item of ${size} bytes doesn't fit into a message`);
    let full;
    const count = this.#items.length;
    if (count >= maxMessageItems || (count && bodyBytes(this.#bytes + size, count + 1) > maxMessageBytes)) {
      full = this.flush();
    }
    this.#items.push(item);
    this.#bytes += size;
    return full;
  }

  /** @returns {Message|undefined} the collected items, if any */
  flush() {
    const items = this.#items;
    const bytes = bodyBytes(this.#bytes, items.length);
    this.#items = [];
    this.#bytes = 0;
    return items.length ? { items, bytes } : undefined;
  }
}
