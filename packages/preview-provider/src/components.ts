import { Component, getCurrentInstance } from '@vue/runtime-core';
import { defineStubComponent } from './utilities';

export function useComponents(components: Record<string, Component>) {
  const instance = getCurrentInstance();
  if (instance != null) {
    const { app } = instance.appContext;

    Object.entries(components).forEach(([name, component]) => {
      app.component(name, defineStubComponent(name, component));
    });
  }
}
