import './reset.css';
import './app.css';

import { components } from '@preview-component-index';
import { createApp, h, provide, ref } from 'vue';
import Dashboard from './components/Dashboard.vue';
import { COMPONENTS } from './config';

const state = ref(components);
const app = createApp({
  name: 'Preview',
  setup() {
    provide(COMPONENTS, state);

    return () => h(Dashboard);
  },
});

app.mount('#__preview__app__');

if (import.meta.hot) {
  import.meta.hot.acceptDeps('@preview-component-index', (newModule) => {
    console.log('HOT', newModule);
  });
}
