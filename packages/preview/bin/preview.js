#!/usr/bin/env node

const argv = require('minimist')(process.argv.slice(2));
// make sure to set debug flag before requiring anything
if (argv.debug) {
  process.env.DEBUG = `@vuedx/preview:` + (argv.debug === true ? '*' : argv.debug);
  try {
    // this is only present during local development
    require('source-map-support').install();
  } catch (e) {}
}

require('../dist/cli').run(argv);
