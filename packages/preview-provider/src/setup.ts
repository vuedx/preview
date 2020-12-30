import { h, inject, reactive } from 'vue';
import { useComponents } from './components';
import { useRequests } from './fetch';
import { provider } from './utilities';
const X = {
  getUser(id: string) {
    return { id, name: 'string' };
  },
};

export function definePreviewComponent() {
  const x = inject<typeof X>('@preview:context:x');
  const state = reactive({
    name: '',
  });

  const $p = { ...provider, state, x };

  useRequests({
    '/api/repositories': $p.repeat(10, (id) => ({ id })),
    '/api/repositories/:id': ({ id }) => $p.x.getUser(id),
    '/api/repositories/znck0': $p.http.status(404),
  });

  useComponents({
    MyComp: $p.stub(),
  });

  const __exp0 = $p.on('MyComponent.click');
  const __exp1 = $p.string();
  const __exp2 = $p.number.percentage();
  const __exp3 = $p.string.person.firstName();
  const __exp4 = $p.component.image.unsplash('person');

  return () => {
    return [
      h(
        'MyComponent',
        {
          modelValue: $p.state.name,
          'onUpdate:modelValue': (event) => ($p.state.name = event),
          onClick: __exp0,
          name: __exp1,
          value: __exp2,
          firstName: __exp3,
        },
        {
          default: () => h(__exp4),
        }
      ),
    ];
  };
}
