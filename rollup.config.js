import TS from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import commonjs from '@rollup/plugin-commonjs';
import builtin from 'builtin-modules';
import dts from 'rollup-plugin-dts';
import Path from 'path';

/** @type {import('rollup').RollupOptions[]} */
const config = [
  bundle('preview-compiler'),
  types('preview-compiler'),

  bundle('preview-provider'),
  types('preview-provider', { entryName: '../dist/types/index.d.ts' }),

  bundle('preview-test-utils'),
  types('preview-test-utils', { entryName: '../dist/types/index.d.ts' }),

  bundle('preview', { entryName: 'plugin.ts' }),
  bundle('preview', { entryName: 'cli.ts', outputName: 'cli.js', formats: ['cjs'] }),
  types('preview', { entryName: 'plugin.ts' }),

  bundle('extension', { outputName: 'extension.js', external: ['vscode'], formats: ['cjs'] }),
];

export default config;

/**
 * @param {string} packageName
 * @param {{entryName?: string, outputName?: string, formats?: string[], external?: string[] }} [options]
 * @returns {import('rollup').RollupOptions}
 */
function bundle(
  packageName,
  {
    entryName = 'index.ts',
    outputName = `${packageName}.js`,
    formats = ['es', 'cjs'],
    external = [],
  } = {}
) {
  const baseDir = Path.resolve(__dirname, packageName === 'extension' ? '.' : './packages');
  /** @type {import('rollup').OutputOptions[]} */
  const output = [
    {
      file: `${baseDir}/${packageName}/dist/${outputName}`,
      format: 'cjs',
      sourcemap: true,
      sourcemapExcludeSources: false,
    },
    {
      file: `${baseDir}/${packageName}/dist/${outputName.replace(/\.js$/, '.esm.js')}`,
      format: 'es',
      sourcemap: true,
      sourcemapExcludeSources: false,
    },
  ];

  const BUILD = process.env.BUILD ?? 'production';
  const isProd = BUILD === 'production';

  return {
    input: `${baseDir}/${packageName}/src/${entryName}`,
    output: output.filter((output) => formats.includes(output.format ?? '')),
    plugins: [
      resolve(),
      commonjs(),
      replace({
        values: {
          __DEV__: JSON.stringify(!isProd),
          __PROD__: JSON.stringify(isProd),
          __PREVIEW_INSTALLATION_SOURCE__: JSON.stringify(
            Path.resolve(__dirname, './packages/preview/')
          ),
        },
      }),
      TS({
        tsconfig: `${baseDir}/${packageName}/tsconfig.json`,
      }),
    ],
    external: [
      ...builtin,
      ...external,
      ...Object.keys(require(`${baseDir}/${packageName}/package.json`).dependencies ?? {}),
    ],
  };
}

/**
 * @param {string} packageName
 * @param {{entryName?: string, outputName?: string, formats?: string[], external?: string[] }} [options]
 * @returns {import('rollup').RollupOptions}
 */
function types(
  packageName,
  { entryName = 'index.ts', outputName = `${packageName}.d.ts`, external = [] } = {}
) {
  const config = bundle(packageName, { entryName, outputName, formats: ['es'], external });

  config.plugins = [dts()];

  return config;
}
