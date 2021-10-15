// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - rollup-plugin-dts does not work with export *
import { getCurrentInstance, onUnmounted } from 'vue';
import { getActiveComponent } from './activeComponent';
import { notify } from './communication';
type RequestHandler = (request: Request) => any;

export type RequestOptions = Record<string, RequestHandler | Record<string, any>>;

interface InterceptorRecord {
  name: string;
  matcher(request: Request): Promise<boolean> | boolean;
  handler: RequestHandler;
}

const state: { interceptors: InterceptorRecord[]; warned: Set<string> } = {
  interceptors: [],
  warned: new Set('/'),
};
const REQUEST_RE = /^(GET|POST|PUT|DELETE|HEAD)(\|(GET|POST|PUT|DELETE|HEAD))*\s+/i;
const GRAPHQL_RE = /^(QUERY|MUTATION)\s+/i;

/**
 * @param options register request handlers/interceptors.
 */
export function useRequests(options: RequestOptions): void {
  state.interceptors = Object.entries(options).map(([key, value]): InterceptorRecord => {
    const handler = (typeof value === 'function' ? value : () => value) as any;
    const graphql = GRAPHQL_RE.exec(key);
    if (graphql != null) {
      const [type, url, pattern] = key.split(/[ ]+/) as [string, string] | [string, string, string];
      return {
        name: key,
        matcher: async (request) => {
          if (!matches(request.url, url)) return false;

          let query: string | null = null;
          if (type?.toUpperCase() === 'QUERY') {
            if (request.method === 'GET') {
              const requestURL = new URL(request.url);
              query = requestURL.searchParams.get('query');
            }
          }

          if (request.method === 'POST') {
            try {
              const body = await request.clone().json();
              query = typeof body.query === 'string' ? body.query : null;
            } catch {}
          }

          if (query != null) {
            if (pattern == null) return true;
            else
              return matchPattern(query.replace(/[ \r\n]/g, ''), pattern.replace(/[ \r\n]/g, ''));
          }

          return false;
        },
        handler,
      };
    }
    const http = REQUEST_RE.exec(key);
    if (http != null) {
      const [type, url] = key.split(/[ ]+/) as [string, string];
      const methods = new Set(type.toUpperCase().split('|'));

      console.log(http);

      return {
        name: key,
        matcher: (request) => methods.has(request.method) && matches(request.url, url),
        handler,
      };
    }

    return {
      name: key,
      matcher: (request) => {
        return matches(request.url, key);
      },
      handler,
    };
  });

  if (getCurrentInstance() != null) {
    onUnmounted(() => {
      state.interceptors = [];
    });
  }
}

function matches(url: string, pattern: string): boolean {
  if (pattern === '*') return true;
  if (pattern.includes('*')) {
    return matchPattern(pattern.startsWith('/') ? new URL(url).pathname : url, pattern);
  }
  if (pattern.startsWith('/')) {
    return new URL(url).pathname === pattern;
  }

  return url === pattern;
}

function matchPattern(text: string, pattern: string): boolean {
  if (pattern.includes('*')) {
    const RE = new RegExp(`^${pattern.replace(/\*/g, '.*?')}$`);

    return RE.test(text);
  } else {
    return text === pattern;
  }
}

/**
 * Install fetch interceptors.
 */
export function installFetchInterceptor(): void {
  const fetch = window.fetch;

  window.fetch = async function (input: RequestInfo, init?: RequestInit): Promise<Response> {
    const request =
      input instanceof Request ? new Request(input.clone(), init) : new Request(input, init);
    const interceptor = await getInterceptor(request);

    if (interceptor != null) {
      const active = getActiveComponent();
      const group = active.name != null ? `[${active.name}] ` : '';
      console.groupCollapsed(`${group}Request handled by: ${interceptor.name}`);
      console.debug(request);
      console.groupEnd();
      const result = await interceptor.handler(request);
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

      const response = encode(result.default != null ? result.default : result);

      const copy = response.clone();

      const body =
        copy.headers.get('Content-Type') === 'application/json'
          ? await copy.json()
          : await copy.text();

      console.groupCollapsed(`${group}Response from: ${interceptor.name}`);
      console.debug(copy);
      console.debug(body);
      console.groupEnd();
      return response;
    }

    const id = `${request.method} ${request.url}`;
    if (!state.warned.has(id)) {
      state.warned.add(id);
      notify('missing-request-handler', { request, body: await request.clone().text() });
    }

    return fetch(request);
  };
}

async function getInterceptor(request: Request): Promise<InterceptorRecord | null> {
  for (const interceptor of state.interceptors) {
    if (await interceptor.matcher(request)) {
      return interceptor;
    }
  }

  return null;
}
