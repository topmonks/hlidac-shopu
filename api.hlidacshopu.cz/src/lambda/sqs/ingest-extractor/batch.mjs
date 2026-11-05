// The queue accepts messages up to 256KB, leave some reserve
export const maxMessageBytes = 250 * 1024;
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
  return bodyBytes(size, 1) <= maxMessageBytes;
}

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
   * @returns {any[]|undefined} items of the previous message, when the new item didn't fit into it
   */
  add(item, size) {
    let full;
    const count = this.#items.length;
    if (count >= maxMessageItems || bodyBytes(this.#bytes + size, count + 1) > maxMessageBytes) {
      full = this.flush();
    }
    this.#items.push(item);
    this.#bytes += size;
    return full;
  }

  /** @returns {any[]|undefined} the collected items, if any */
  flush() {
    const items = this.#items;
    this.#items = [];
    this.#bytes = 0;
    return items.length ? items : undefined;
  }
}
