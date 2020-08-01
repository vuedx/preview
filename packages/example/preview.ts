import { Component, createApp as create, h } from 'vue';
import './source/style.css';

export function createApp(component: Component) {
  return create({
    setup() {
      return () =>
        h('div', { class: 'flex flex-row h-screen items-center justify-center p-4' }, [
          h(component),
        ]);
    },
  });
}
