import { Component, getCurrentInstance } from 'vue';
import { defineStubComponent } from './utilities';

export function useComponents(components: Record<string, Component>) {
  const { app } = getCurrentInstance().appContext;

  Object.entries(components).forEach(([name, component]) => {
    app.component(name, defineStubComponent(name, component));
  });
}
