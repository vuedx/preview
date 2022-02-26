const vuePlugin = require('@vitejs/plugin-vue').default;
const Path = require('path');
const MagicString = require('magic-string').default;

module.exports = /** @type {import('vite').UserConfig} */ ({
  plugins: [
    vuePlugin(),
    {
      transform(code, id) {
        if (id.endsWith('.vue')) {
          const magic = new MagicString(code);

          magic.append(
            `\n_sfc_main.__file = _sfc_main.__file ?? ${JSON.stringify(Path.basename(id))}\n`
          );

          return {
            code: magic.toString(),
            map: JSON.parse(magic.generateMap().toString()),
          };
        }
      },
    },
  ],
  css: {
    modules: false,
  },
  define: {
    __VUE_PROD_DEVTOOLS__: JSON.stringify(true),
  },
});
