import TS from '@rollup/plugin-typescript';

/** @type {import('rollup').RollupOptions[]} */
const config = [
  {
    input: 'packages/preview-compiler/src/index.ts',
    output: {
      file: 'packages/preview-compiler/dist/preview-compiler.js',
      format: 'cjs',
    },
    plugins: [
      TS({
        tsconfig: 'packages/preview-compiler/tsconfig.json',
      }),
    ],
    external: [
      'path',
      ...Object.keys(require('./packages/preview-compiler/package.json').dependencies),
    ],
  },
  {
    input: 'packages/preview-provider/src/index.ts',
    output: {
      file: 'packages/preview-provider/dist/preview-provider.js',
      format: 'esm',
    },
    plugins: [
      TS({
        tsconfig: 'packages/preview-provider/tsconfig.json',
      }),
    ],
    external: [
      'path',
      ...Object.keys(require('./packages/preview-provider/package.json').dependencies),
    ],
  },
  {
    input: 'packages/preview/src/plugin.ts',
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
    input: 'packages/preview/src/cli.ts',
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
    plugins: [TS({ tsconfig: 'packages/preview/tsconfig.json' })],
  },
  {
    input: 'extension/src/index.ts',
    output: {
      file: 'extension/dist/extension.js',
      format: 'cjs',
      sourcemap: true,
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
