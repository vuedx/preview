/** @type {import('@jest/types').Config.InitialOptions} */
const config = {
  verbose: true,
  testMatch: [],
  rootDir: __dirname,
  moduleFileExtensions: ['ts', 'mjs', 'js', 'cjs', 'json', 'vue'],
  projects: ['<rootDir>/packages/*/jest.config.js'],
};

module.exports = config;
