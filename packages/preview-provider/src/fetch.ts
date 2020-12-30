import { notify } from './communication';
import { onUnmounted } from 'vue';
interface RequestHandler {
  (
    params: Record<string, string>,
    options: RequestInit & {
      query: Record<string, string | string[]>;
    }
  ): any;
}

export type RequestOptions = Record<string, RequestHandler | Record<string, any>>;

const interceptors: Array<Array<{ method: string; url: string; handler: RequestHandler }>> = [];

const REQUEST_RE = /^(GET|POST|PUT|DELETE|HEAD)?\s?(.+)$/;

/**
 * @param options register request handlers/interceptors.
 */
export function useRequests(options: RequestOptions): void {
  const requests = Object.entries(options).map(([key, value]) => {
    const result = REQUEST_RE.exec(key) ?? [, , key];
    return {
      method: result[1] ?? 'GET',
      url: result[2],
      handler: (typeof value === 'function' ? value : () => value) as any,
    };
  });

  interceptors.push(requests);

  onUnmounted(() => {
    const index = interceptors.indexOf(requests);
    if (index >= 0) interceptors.splice(index, 1);
  });
}

/**
 * Install fetch interceptors.
 */
export function installFetchInterceptor(): void {
  const fetch = window.fetch;

  window.fetch = async function (input: RequestInfo, init?: RequestInit): Promise<Response> {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method ?? (typeof input === 'string' ? 'GET' : input.method);
    const interceptor = interceptors
      .flat()
      .find((interceptor) => interceptor.method === method && interceptor.url === url);

    if (interceptor != null) {
      const result = await interceptor.handler({}, { ...(init ?? { url, method }), query: {} });

      return new Response(JSON.stringify(result));
    }

    notify('missing-request-handler', { method, url });

    return fetch(input, init);
  };
}
