/**
 * Usage:
 * node rename.js [files] "[regexMatcher]" "[regexReplace]"
 *
 * Example:
 * node rename.js *.mp3 "(.*)-([0-9].*)\.mp3" "%1.mp3"
 */

import fs from "fs";

const files = process.argv.slice(2, -2);
const regexMatch = new RegExp(process.argv.slice(-2).shift());
const regexReplace = process.argv.slice(-1).shift().replace(/%/, "$");

const filesToRename = files
  .map(current => ({
    current,
    newName: current.replace(regexMatch, regexReplace)
  }))
  .filter(({ current, newName }) => current !== newName);

for (const { current, newName } of filesToRename) {
  console.log(`Renaming ${current} -> ${newName}`);
  await fs.promises.rename(current, newName);
}
