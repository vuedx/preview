import { ref } from 'vue';

interface PreviewMetadata {
  id: number;
  name: string;
  device: string;
  deviceProps: Record<string, string | boolean>;
}

export interface ComponentMetadata {
  id: string;
  name: string;
  path: string;
  previews: PreviewMetadata[];
}

export const components = ref<ComponentMetadata[]>((window as any).components ?? []);

window.addEventListener('preview:components' as any, (event: CustomEvent<ComponentMetadata[]>) => {
  components.value = event.detail;
});

if (import.meta.env.DEV) {
  components.value = [
    {
      id: 'component/Alert',
      name: 'Alert',
      path: 'component/Alert.vue',
      previews: [
        { id: 1, name: 'One', device: 'freeform', deviceProps: { controls: true } },
        { id: 2, name: 'Two', device: 'mobile', deviceProps: {} },
        { id: 3, name: 'Three', device: 'desktop', deviceProps: {} },
      ],
    },
    {
      id: 'component/Button.vue',
      name: 'Button',
      path: 'component/in-a-very/very/very/very/deep/directory/Button.vue',
      previews: [
        { id: 1, name: 'One', device: 'freeform', deviceProps: { controls: true } },
        { id: 2, name: 'Two', device: 'mobile', deviceProps: {} },
        { id: 3, name: 'Three', device: 'desktop', deviceProps: {} },
      ],
    },

    ...Array(30)
      .fill(null)
      .map<ComponentMetadata>((_, i) => ({
        id: `component/Example${i}`,
        name: `Example${i}`,
        path: `components/${i}/Example${i}.vue`,
        previews: [
          { id: 1, name: 'One', device: 'freeform', deviceProps: { controls: true } },
          { id: 2, name: 'Two', device: 'mobile', deviceProps: {} },
          { id: 3, name: 'Three', device: 'desktop', deviceProps: {} },
        ] as PreviewMetadata[],
      })),
  ].sort(() => (Math.random() > 0.5 ? 1 : -1));
}
