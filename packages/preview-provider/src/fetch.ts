// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - rollup-plugin-dts does not work with export *
import { getCurrentInstance, onUnmounted } from 'vue';
import { notify } from './communication';
type RequestHandler = (
  params: Record<string, string>,
  options: RequestInit & {
    query: Record<string, string | string[]>;
  }
) => any;

export type RequestOptions = Record<string, RequestHandler | Record<string, any>>;

interface InterceptorRecord {
  method: Set<string>;
  url: string;
  handler: RequestHandler;
}

const state: { interceptors: InterceptorRecord[]; warned: Set<string> } = {
  interceptors: [],
  warned: new Set('/'),
};
const REQUEST_RE = /^((?:GET|POST|PUT|DELETE|HEAD)(?:\|(?:GET|POST|PUT|DELETE|HEAD))*)?\s?(.+)$/;

/**
 * @param options register request handlers/interceptors.
 */
export function useRequests(options: RequestOptions): void {
  state.interceptors = Object.entries(options).map(([key, value]): InterceptorRecord => {
    const result = REQUEST_RE.exec(key);
    return {
      method: new Set(result?.[1]?.split('|') ?? ['GET']),
      url: result?.[2] ?? key,
      handler: (typeof value === 'function' ? value : () => value) as any,
    };
  });

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
    const interceptor = getInterceptor(method, url);

    if (interceptor != null) {
      const result = await interceptor.handler({}, { ...(init ?? { url, method }), query: {} });
      const encode = (result: unknown): Response => {
        if (result instanceof Response) return result;
        else if (typeof result === 'string')
          return new Response(result, {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'text/plain' },
          });
        else
          return new Response(JSON.stringify(result), {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': 'application/json' },
          });
      };

      if (result.__esModule === true && result.default != null) {
        return encode(result.default);
      }

      return encode(result);
    }

    const id = `${method} ${url}`;
    if (!state.warned.has(id)) {
      state.warned.add(id);
      notify('missing-request-handler', { method, url });
    }

    return fetch(input, init);
  };
}

function getInterceptor(method: string, url: string): InterceptorRecord | undefined {
  return (
    state.interceptors.find(
      (interceptor) => interceptor.method.has(method) && interceptor.url === url
    ) ??
    state.interceptors.find(
      (interceptor) => interceptor.method.has(method) && interceptor.url === '*'
    )
  );
}
