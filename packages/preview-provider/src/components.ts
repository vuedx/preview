// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore - export * is not supported from rollup-plugin-dts
import { Component, defineAsyncComponent, getCurrentInstance } from 'vue';

export function useComponents(components: Record<string, Component>): void {
  const instance = getCurrentInstance();
  if (instance != null) {
    const { app } = instance.appContext;

    Object.entries(components).forEach(([name, component]) => {
      app.component(
        name,
        typeof component === 'function' ? defineAsyncComponent(component as any) : component
      );
    });
  }
}
