// @ts-check
module.exports = /** @type {import('vitepress').UserConfig} */ ({
  title: 'Preview',
  description: '',
  head: [
    ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' }],
    ['link', { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' }],
    ['link', { rel: 'manifest', href: '/site.webmanifest' }],
    ['link', { rel: 'mask-icon', href: '/safari-pinned-tab.svg', color: '#ec3d3d' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'VueDX Preview' }],
    ['meta', { name: 'application-name', content: 'VueDX Preview' }],
    ['meta', { name: 'msapplication-TileColor', content: '#b91d47' }],
    ['meta', { name: 'theme-color', content: '#ffffff' }],
  ],
  themeConfig: {
    locales: {},
  },
});
