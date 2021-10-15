// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - export * is not supported from rollup-plugin-dts
import type { Component } from 'vue';
import { getActiveComponent, setActiveComponent } from './activeComponent';
import { useComponents } from './components';
import { installFetchInterceptor, RequestOptions, useRequests } from './fetch';
import { provider } from './utilities';

export interface SetupOptions<T = any> {
  requests: RequestOptions;
  components: Record<string, Component>;
  state: T;
}

export {
  provider,
  useRequests,
  useComponents,
  installFetchInterceptor,
  setActiveComponent,
  getActiveComponent,
};
