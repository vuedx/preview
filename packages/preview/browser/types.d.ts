import { Component } from 'vue';

export interface ComponentModule {
  id: string;
  name: string;
  path: string;
  previews: Array<Omit<ComponentPreview, 'component'>>;
  loader: () => Promise<{
    default: Component & { __previews__: ComponentPreview[] };
  }>;
}

export interface ComponentPreview {
  name: string;
  device: string;
  component: Component;
}

export interface Device {
  name: string;
  dimensions: {
    width: number;
    height: number;
  };
}
