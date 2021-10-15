const vuePlugin = require('@vitejs/plugin-vue').default;

module.exports = /** @type {import('vite').UserConfig} */ ({
  plugins: [vuePlugin()],
  css: {
    modules: false,
  },
  define: {
    __VUE_PROD_DEVTOOLS__: JSON.stringify(true),
  },
});
