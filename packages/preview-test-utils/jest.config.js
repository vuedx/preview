const Path = require('path');
const { name } = require('./package.json');

const TS_CONFIG = Path.resolve(__dirname, 'tsconfig.json');
const SETUP_FILE = Path.resolve(__dirname, './test/setup.ts');

/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  displayName: {
    name,
    color: 'red',
  },
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.vue$': 'vue-jest',
  },
  setupFiles: [SETUP_FILE],
  globals: {
    'ts-jest': {
      tsconfig: TS_CONFIG,
      isolatedModules: true,
    },
    'vue-jest': {
      tsConfig: TS_CONFIG,
    },
  },
};

module.exports = config;
