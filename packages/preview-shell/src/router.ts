import { defineAsyncComponent } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

const isPluginMode = window.location.pathname.startsWith('/__preview');

const router = createRouter({
  history: createWebHistory(isPluginMode ? '/__preview' : undefined),
  routes: [
    {
      name: 'dashboard',
      path: '/',
      component: defineAsyncComponent(async () => await import('./pages/dashboard.vue')),
      props: (route) => ({ fileName: route.query['fileName'] ?? route.query['filename'] }),
    },
    {
      name: 'sandbox',
      path: '/sandbox',
      component: defineAsyncComponent(async () => await import('./pages/sandbox.vue')),
      props: (route) => ({ fileName: route.query['fileName'] ?? route.query['filename'] }),
    },
  ],
});

export { router };
