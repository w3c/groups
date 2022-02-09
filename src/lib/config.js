/* eslint-env node */

"use strict";

import path from 'path';
import { fileURLToPath } from 'url';

// from https://nodejs.org/dist/latest-v16.x/docs/api/esm.html#no-json-module-loading
import { readFile } from 'fs/promises';
const config = JSON.parse(await readFile(new URL('../config.json', import.meta.url)));

// environment variables

// see http://expressjs.com/en/advanced/best-practice-performance.html#set-node_env-to-production
config.env = process.env["NODE_ENV"] || config.env || "development";
config.port = process.env["PORT"] || config.port || 8080;
config.host = process.env["HOST"] || config.host || "localhost";
config.basedir = process.env["NODE_BASEDIR"] || config.basedir || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");


// DEBUG mode

config.debug = (config.env === "development") || config.debug || false;

// auth tokens and keys

config.ghToken = config.ghToken || "missing-GitHub-token";
config.w3capikey = config.w3capikey || "missing-W3C-API-key";

// app specifics
config.allowOrigins = config.allowOrigins || [];
config.refreshCycle = config.refreshCycle || 24;

config.dest_directory = path.resolve(config.basedir, config.dest_directory || "");

// dump the configuration into the server log (but not in the server monitor!)
console.log("".padStart(80, '-'));
console.log("Configuration:");
for (const [key, value] of Object.entries(config)) {
  console.log(`${key.padStart(20, ' ')} = ${value}`);
}
console.log("".padStart(80, '-'));

// options is an array of String
config.checkOptions = function(...options) {
  let correct = true;
  options.forEach(option => {
    if (!config[option]) {
      console.error(`config.${option} is missing.`);
      correct = false;
    }
  });
  return correct;
}

export default config;
