import commonjs from '@rollup/plugin-commonjs';
import node from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { generateRollupOptions } from '@vuedx/monorepo-tools';
import * as Path from 'path';

const BUILD = process.env.BUILD ?? 'production';
const isProd = BUILD === 'production';
const values = {
  __DEV__: JSON.stringify(!isProd),
  __PROD__: JSON.stringify(isProd),
  __PREVIEW_INSTALLATION_SOURCE__: JSON.stringify(Path.resolve(__dirname, './packages/preview/')),
};

export default generateRollupOptions({
  extend(kind, info) {
    if (kind === 'dts') return info.rollupOptions;

    return {
      ...info.rollupOptions,
      plugins: [
        node(),
        commonjs(),
        replace({ values, preventAssignment: true }),
        typescript({
          tsconfig: info.tsconfig?.configFile,
        }),
      ],
    };
  },
});
