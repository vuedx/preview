const vuePlugin = require('@vitejs/plugin-vue').default;

module.exports = /** @type {import('vite').UserConfig} */ ({
  plugins: [vuePlugin()],
  clearScreen: false,
});
