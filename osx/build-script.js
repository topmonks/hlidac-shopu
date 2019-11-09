#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

const __source_path = path.resolve(__dirname, '../extension');
const __dest_path = path.resolve(
    __dirname,
    './hlidac-shopu/hlidac-shopu-extension',
);

execSync(
    `babel ${__source_path}/lib ${__source_path}/shops ${__source_path}/index.js --out-file ${__dest_path}/script.js`,
);
// execSync(`babel ${__source_path}/index.js --out-file ${__dest_path}/ext.js`);
