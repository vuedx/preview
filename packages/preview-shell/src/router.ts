import { defineAsyncComponent } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      name: 'dashboard',
      path: '/',
      component: defineAsyncComponent(() => import('./pages/dashboard.vue')),
      props: (route) => ({ fileName: route.query.fileName ?? route.query.filename }),
    },
    {
      name: 'sandbox',
      path: '/sandbox',
      component: defineAsyncComponent(() => import('./pages/sandbox.vue')),
      props: (route) => ({ fileName: route.query.fileName ?? route.query.filename }),
    },
  ],
});

export { router };
