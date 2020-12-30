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

window.addEventListener('@preview:components', (event: CustomEvent<ComponentMetadata[]>) => {
  components.value = event.detail;
});
