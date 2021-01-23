import type { Component } from 'vue';
import { useComponents } from './components';
import { useRequests, installFetchInterceptor, RequestOptions } from './fetch';
import { provider } from './utilities';

export interface SetupOptions<T = any> {
  requests: RequestOptions;
  components: Record<string, Component>;
  state: T;
}

export { provider, useRequests, useComponents, installFetchInterceptor };
