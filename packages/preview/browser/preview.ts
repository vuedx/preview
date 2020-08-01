import '@preview-auto-setup';
import * as setup from '@preview-auto-setup';
import { components } from '@preview-component-index';
import { createApp, h, onErrorCaptured, ref, defineComponent } from 'vue';
import { getQueryParams } from './utilities';
import { ComponentPreview } from './types';

const { id, name } = window.frameElement
  ? getQueryParams(window.frameElement.getAttribute('src').split('?').pop())
  : getQueryParams(location.search.split('?').pop());

const component = components.find((component) => component.id === id);
const ErrorComponent = defineComponent({
  props: { error: String },
  setup(props) {
    return () =>
      h(
        'div',
        {
          style:
            'width: 100vw; height: 100vh; display: flex; flex-direction: row; padding: 16px; background-color: #FF0000; color: #660000',
        },
        [props.error]
      );
  },
});
if (component) {
  component
    .loader()
    .then(async ({ default: App }) => {
      const previews = App.__previews__ || [];
      const preview =
        previews.find((preview) => preview.name === name) ||
        ({ name, component: App, device: '' } as ComponentPreview);
      const app = (setup.createApp || createApp)({
        setup() {
          if (preview) {
            document.title = `${preview.name} — ${component.name}`;
          }

          const errorInfo = ref(null);
          onErrorCaptured((_, __, info) => {
            errorInfo.value = info;
          });

          return () => {
            if (errorInfo.value) {
              return h(ErrorComponent, {
                error: errorInfo.value,
              });
            }

            return h(preview.component, { key: preview.name });
          };
        },
      });

      if (setup.configureApp) {
        const result = await setup.configureApp(app);

        if (result) return result;
      }

      // @ts-ignore
      window.__preview__ = app;

      return app;
    })
    .then((app) => {
      app.mount('#app');
    });
} else {
  createApp({
    setup() {
      return () =>
        h(ErrorComponent, {
          error: `🙅 Component not found. id: ${id} preview: ${name}`,
        });
    },
  }).mount('#app');
}
