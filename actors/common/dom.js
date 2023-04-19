import { DOMParser } from "linkedom/cached";

/**
 * @param {string} text
 * @return {{document: HTMLDocument}}
 */
export function parseHTML(text) {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "text/html");
  return { document };
}

/**
 * @param {string} text
 * @return {{document: XMLDocument}}
 */
export function parseXML(text) {
  const parser = new DOMParser();
  const document = parser.parseFromString(text, "text/xml");
  return { document };
}
