const { name } = require('./package.json');

/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  displayName: {
    name,
    color: 'magenta',
  },
  verbose: true,
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': 'vue-jest',
  },
  transformIgnorePatterns: ['node_modules'],
  rootDir: __dirname,
};
