const vuePlugin = require('@vitejs/plugin-vue').default;
const { PreviewPlugin } = require('../packages/preview');

module.exports = /** @type {import('vite').UserConfig} */ ({
  plugins: [vuePlugin(), PreviewPlugin()],
  clearScreen: false,
  server: {
    host: 'dev.thesemetrics.org',
    port: 2000,
  },
});
