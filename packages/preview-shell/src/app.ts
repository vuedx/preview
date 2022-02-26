import './app.css';
import { createApp } from 'vue';
import Root from './Root.vue';
import { router } from './router';

Root.name = 'Preview';
const app = createApp(Root);

app.use(router);

export { app };
