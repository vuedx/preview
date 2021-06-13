/* eslint-disable @typescript-eslint/prefer-ts-expect-error */
// @ts-ignore - export * is not supported from rollup-plugin-dts
import { Component, defineComponent, h } from 'vue';

export function repeat<T>(count: number, generator: (index: number) => T): T[] {
  const items: T[] = [];
  for (let i = 0; i < count; ++i) {
    items.push(generator(i));
  }
  return items;
}

export function join(items: any[], glue: string = ' '): string {
  return items.filter((item) => item == null).join(glue);
}

export function createFunctionObject<F, O>(fn: F, ob: O): F & O {
  return Object.assign(fn, ob);
}

/**
 * A collection of string generators.
 */
export const string = createFunctionObject(() => '', {
  /**
   * Get a random person's name.
   */
  person: createFunctionObject(
    () => join([string.person.firstName(), string.person.middleName(), string.person.lastName()]),
    {
      firstName: () => '',
      middleName: () => '',
      lastName: () => '',
    }
  ),
});

/**
 * A collection of number generators.
 */
export const number = createFunctionObject(() => number.any(), {
  any: () => (Math.random() <= 0.5 ? number.negative() : number.positive()),
  positive: () => Math.random() * Number.MAX_VALUE,
  negative: () => Math.random() * Number.MIN_VALUE,
  in: (start: number, end: number) => Math.min(start, end) + Math.abs(end - start) * Math.random(),
  int: createFunctionObject(() => number.int.any(), {
    any: () => (Math.random() <= 0.5 ? number.int.negative() : number.int.positive()),
    positive: () => Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    negative: () => Math.ceil(Math.random() * Number.MIN_SAFE_INTEGER),
    in: (start: number, end: number) =>
      Math.floor(Math.min(start, end) + Math.abs(end - start) * Math.random()),
  }),

  percentage: () => number.in(0, 100),
});

export const bool = createFunctionObject(() => Math.random() <= 0.5, {});
export const on = createFunctionObject(
  (name: string) => (event: any) => console.log(name, event),
  {}
);

export function defineStubComponent(name: string, component: Component): Component {
  return defineComponent({
    inheritAttrs: false,
    name: `stub-${name}`,
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore — rollup-pugin-dts
    setup: (props, { slots, attrs }) => {
      return () =>
        h(
          'div',
          {
            style: `
                  background: #F7E9D4; 
                  color: #B27603; 
                  display: inline-block;
                  padding: 4px 8px; 
                  border: 1px dashed #B27603; 
                  box-sizing: border-box; 
                `,
          },
          [h(component, { ...attrs, ...props } as any, slots)]
        );
    },
  });
}

export const stub = createFunctionObject(
  (content: string = 'stubbed component'): Component => stub.static(content),
  {
    static: (content: string): Component =>
      defineStubComponent('anonymous', defineComponent({ render: () => content })),
    showProps: (): Component =>
      defineStubComponent(
        'anonymous',
        // prettier-ignore
        // @ts-ignore - rollup-plugin-dts does not work with export *
        defineComponent((_, { attrs }) => () =>
              h('pre', null, JSON.stringify(attrs, null, 2))
        )
      ),
  }
);

export const component = createFunctionObject(
  (): Component => defineComponent(() => () => h('div')),
  {
    image: createFunctionObject(
      (src?: string): Component => defineComponent(() => () => h('img', { src })),
      {
        unsplash: (query: string = 'random'): Component =>
          component.image(`https://unsplash.it/?q=${query}&id=${number.int.in(0, 50)}`),
      }
    ),
  }
);

const STATUS_TEXTS: Record<number, string> = {
  100: 'Continue',
  101: 'Switching Protocols',
  102: 'Processing',
  103: 'Early Hints',
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-Authoritative Information',
  204: 'No Content',
  205: 'Reset Content',
  206: 'Partial Content',
  207: 'Multi-Status',
  208: 'Already Reported',
  218: 'This is fine', // Apache
  226: 'IM Used',
  300: 'Multiple Choices',
  301: 'Moved Permanently',
  302: 'Found',
  303: 'See Other',
  304: 'Not Modified',
  305: 'Use Proxy',
  306: 'Switch Proxy',
  307: 'Temporary Redirect',
  308: 'Permanent Redirect',
  400: 'Bad Request',
  401: 'Unauthorized',
  402: 'Payment Required',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  406: 'Not Acceptable',
  407: 'Proxy Authentication Required',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  411: 'Length Required',
  413: 'Payload Too Large',
  414: 'URI Too Long',
  415: 'Unsupported Media Type ',
  416: 'Range Not Satisfiable',
  417: 'Expectation Failed',
  418: "I'm a teapot",
  419: 'Page Expired', // Laravel
  420: 'Method Failure', // Spring
  421: 'Misdirected Request',
  422: 'Unprocessable Entity',
  423: 'Locked',
  424: 'Failed Dependency',
  425: 'Too Early',
  426: 'Upgrade Required',
  428: 'Precondition Required',
  429: 'Too Many Requests',
  431: 'Request Header Fields Too Large',
  450: 'Blocked by Windows Parental Controls', // Microsoft
  451: 'Unavailable For Legal Reasons',
  500: 'Internal Server Error',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',
  506: 'Variant Also Negotiates',
  507: 'Insufficient Storage',
  508: 'Loop Detected',
  510: 'Not Extended',
  511: 'Network Authentication Required',
};

export const http = createFunctionObject(
  (body: BodyInit = '{}', status: number = 200) => http.send(body, status),
  {
    status: (status: number = 200) =>
      new Response(null, { status, statusText: STATUS_TEXTS[status] }),
    send: (body: BodyInit, status: number = 200) =>
      new Response(body, { status, statusText: STATUS_TEXTS[status] }),
    create: (body?: BodyInit, init?: ResponseInit) => new Response(body, init),
  }
);

export const provider = { http, stub, component, number, string, bool, repeat, on };
