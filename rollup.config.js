import TS from 'rollup-plugin-typescript2';

/** @type {import('rollup').RollupOptions[]} */
const config = [
  {
    input: 'packages/preview/source/plugin.ts',
    output: {
      file: 'packages/preview/dist/preview.js',
      format: 'cjs',
    },
    external: [
      'path',
      'fs',
      'vite',
      'source-map-support',
      ...Object.keys(require('./packages/preview/package.json').dependencies),
    ],
    plugins: [
      TS({
        tsconfig: 'packages/preview/tsconfig.json',
      }),
    ],
  },
  {
    input: 'packages/preview/source/cli.ts',
    output: {
      file: 'packages/preview/dist/cli.js',
      format: 'cjs',
    },
    external: [
      'path',
      'fs',
      'vite',
      'os',
      'source-map-support',
      ...Object.keys(require('./packages/preview/package.json').dependencies),
    ],
    plugins: [TS()],
  },
  {
    input: 'extension/src/index.ts',
    output: {
      file: 'extension/dist/extension.js',
      format: 'cjs',
    },
    external: [
      'vscode',
      'child_process',
      'path',
      'fs',
      ...Object.keys(require('./extension/package.json').dependencies),
    ],
    plugins: [TS({ tsconfig: 'extension/tsconfig.json' })],
  },
];

export default config;
