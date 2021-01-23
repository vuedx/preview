import { notify } from './communication';
import { getCurrentInstance, onUnmounted } from 'vue';
interface RequestHandler {
  (
    params: Record<string, string>,
    options: RequestInit & {
      query: Record<string, string | string[]>;
    }
  ): any;
}

export type RequestOptions = Record<string, RequestHandler | Record<string, any>>;

interface InterceptorRecord {
  method: string;
  url: string;
  handler: RequestHandler;
}

const state: { interceptors: Array<InterceptorRecord>; warned: Set<string> } = {
  interceptors: [],
  warned: new Set('/'),
};
const REQUEST_RE = /^(GET|POST|PUT|DELETE|HEAD)?\s?(.+)$/;

/**
 * @param options register request handlers/interceptors.
 */
export function useRequests(options: RequestOptions): void {
  state.interceptors = Object.entries(options).map(
    ([key, value]): InterceptorRecord => {
      const result = REQUEST_RE.exec(key);
      return {
        method: result?.[1] ?? 'GET',
        url: result?.[2] ?? key,
        handler: (typeof value === 'function' ? value : () => value) as any,
      };
    }
  );

  if (getCurrentInstance() != null) {
    onUnmounted(() => {
      state.interceptors = [];
    });
  }
}

/**
 * Install fetch interceptors.
 */
export function installFetchInterceptor(): void {
  const fetch = window.fetch;

  window.fetch = async function (input: RequestInfo, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method ?? (typeof input === 'string' ? 'GET' : input.method);
    const interceptor = state.interceptors
      .flat()
      .find((interceptor) => interceptor.method === method && interceptor.url === url);

    if (interceptor != null) {
      const result = await interceptor.handler({}, { ...(init ?? { url, method }), query: {} });

      return new Response(JSON.stringify(result));
    }

    const id = `${method} ${url}`;
    if (!state.warned.has(id)) {
      state.warned.add(id);
      notify('missing-request-handler', { method, url });
    }

    return fetch(input, init);
  };
}
