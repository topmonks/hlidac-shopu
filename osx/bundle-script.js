#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const __source_path = path.resolve(__dirname, '../extension');
const __dest_path = path.resolve(
  __dirname,
  './hlidac-shopu/hlidac-shopu-extension',
);

const ext_scripts = [
  `${__source_path}/shops/*`,
  `${__source_path}/index.js`,
].join(' ');

const lib_scripts = [`${__source_path}/lib/*`].join(' ');

execSync(`rm ${__dest_path}/library.js || true`);
execSync(`rm ${__dest_path}/extension.js || true`);
execSync(`cat ${lib_scripts} > ${__dest_path}/library.js`);
execSync(`cat ${ext_scripts} > ${__dest_path}/extension.js`);
