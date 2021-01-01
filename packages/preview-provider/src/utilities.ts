import { Component, defineComponent, h } from '@vue/runtime-core';

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
 * A collection of string generators.
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
    name: `stub-${name}`,
    setup: (props, { slots }) => {
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
          [h(component, props as any, slots)]
        );
    },
  });
}

export const stub = createFunctionObject(
  (content: string = 'stubbed component') => stub.static(content),
  {
    static: (content: string) =>
      defineStubComponent('anonymous', defineComponent({ render: () => content })),
    showProps: () =>
      defineStubComponent(
        'anonymous',
        defineComponent((_, { attrs }) => () => h('pre', null, JSON.stringify(attrs, null, 2)))
      ),
  }
);

export const component = createFunctionObject(() => defineComponent(() => () => h('div')), {
  image: createFunctionObject((src?: string) => defineComponent(() => () => h('img', { src })), {
    unsplash: (query: string = 'random') =>
      component.image('https://unsplash.it/?q=' + query + '&id=' + number.int.in(0, 50)),
  }),
});

const STATUS_TEXTS: Record<number, string> = {
  200: 'Ok',
  404: 'Not found',
};

export const http = createFunctionObject(
  (body: BodyInit = '{}', status: number = 200) => http.send(body, status),
  {
    status: (status: number = 200) =>
      new Response(null, { status, statusText: STATUS_TEXTS[status] }),
    send: (body: BodyInit, status: number = 200) =>
      new Response(body, { status, statusText: STATUS_TEXTS[status] }),
  }
);

export const provider = { http, stub, component, number, string, bool, repeat, on };
