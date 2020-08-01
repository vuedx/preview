declare module '@preview-auto-setup' {
  import { App, createApp as CreateApp } from 'vue';
  export const configureApp: undefined | ((app: App) => App | Promise<App> | void);
  export const createApp: undefined | typeof CreateApp;
}

declare module '@preview-component-index' {
  export const components: import('./types').ComponentModule[];
}

declare module '*.vue' {
  import { Component } from 'vue';
  const ____component____: Component;
  export default ____component____;
}

declare module '*.svg' {
  const __svg__: string;
  export default __svg__;
}
