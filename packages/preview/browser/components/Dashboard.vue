<script lang="ts">
import { inject, computed, ref, watch, markRaw, defineComponent, provide } from 'vue';
import { COMPONENTS, ZOOM, THEME } from '../config';
import { ComponentModule } from '../types';
import Preview from './Preview.vue';

const current = ref<string>(localStorage.getItem('@preview:current'));
const currentPreview = ref<Record<string, boolean>>({});
const defaultPreviews = [
  { name: 'Phone', device: 'iPhone X' },
  { name: 'Tablet', device: 'iPad Pro 12.9"' },
  { name: 'Desktop', device: 'MacBook Pro 16"' },
];
export default defineComponent({
  components: { Preview },
  setup() {
    const components = inject(COMPONENTS)!;
    const zoom = ref(50);
    const theme = ref<string>('light');

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme.value = 'dark';
    }

    watch(current, (value) => localStorage.setItem('@preview:current', value));
    provide(ZOOM, zoom);
    provide(THEME, theme);

    const options = computed(() => {
      const options = (components.value || []).map((component) => ({
        id: component.id,
        name: component.name,
        previews: (component.previews.length ? component.previews : defaultPreviews).map(
          (preview) => ({
            id: getPreviewId(component.id, preview.name),
            ...preview,
          })
        ),
      }));

      options.sort((a, b) => a.name.localeCompare(b.name));

      return markRaw(options);
    });

    const component = computed(() => {
      const id = current.value;

      return options.value.find((component) => component.id === id);
    });

    function getPreviewId(id: string, name: string) {
      return `id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;
    }

    return { options, current, currentPreview, component, zoom, getPreviewId, theme };
  },
});

if (import.meta.hot) {
  import.meta.hot.on('@preview', (event) => {
    if (event.type === 'pick') {
      current.value = event.id;
    }
  });
}
</script>

<template>
  <div class="dashboard" :class="theme">
    <aside class="sidebar">
      <div class="controls">
        <input type="range" v-model="zoom" min="10" max="200" step="10" list="zoom-levels" />
        <button @click="zoom = 50">50%</button>
        <button @click="zoom = 100">100%</button>
      </div>

      <section>
        <header class="header">Components</header>

        <ul class="components">
          <li v-for="option of options" :key="option.id">
            <label>
              <input type="radio" v-model="current" :value="option.id" />
              {{ option.name }}
            </label>

            <ul v-if="current === option.id">
              <li v-for="preview of option.previews" :key="preview.id">
                <label>
                  <input
                    type="checkbox"
                    @change="
                      currentPreview[preview.id] =
                        currentPreview[preview.id] === false ? true : false
                    "
                    :checked="currentPreview[preview.id] !== false"
                    :value="preview.id"
                  />
                  {{ preview.name }}
                </label>
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <div style="flex: 1;"></div>
      <label>
        <input
          type="checkbox"
          :checked="theme === 'dark'"
          @change="theme = theme === 'dark' ? 'light' : 'dark'"
        />
        Dark Mode
      </label>
    </aside>
    <main class="previews">
      <template v-if="component">
        <template v-for="preview of component.previews">
          <template v-if="currentPreview[getPreviewId(component.id, preview.name)] !== false">
            <Preview
              :key="component.id + ':' + preview.name"
              :name="preview.name"
              :device="preview.device"
              :src="'/preview.html?' + getPreviewId(component.id, preview.name)"
            />
          </template>
        </template>
      </template>

      <div v-else class="empty-state">
        Select a component!
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: row;
  height: 100vh;
}

.sidebar {
  width: 250px;
  padding: 1rem;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.dark .sidebar {
  background-color: #222;
  color: #efefef;
}

.dashboard > main {
  flex: 1;
  overflow: auto;
}

.header {
  font-size: 1rem;
  font-weight: bolder;
  text-transform: uppercase;
}

.controls {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
}

.controls * {
  cursor: pointer;
}

.components li {
  padding: 0.25rem 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 4px;
}

.components li li {
  margin-left: 1rem;
  margin-top: 0.25rem;
  margin-bottom: 0.25rem;
}

.components > li > label {
  display: flex;
  flex-direction: row;
  align-items: center;
}

label,
input[type='range'] {
  cursor: pointer;
}

.previews {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  background-color: #ccc;
  min-height: 100vh;
}

.dark .previews {
  background-color: #444;
}

.empty-state {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding: 0 2rem 2rem;
  height: 100vh;
  flex: 1;
  background-color: #ccc;
  font-size: 2rem;
  letter-spacing: 0.2ch;
  text-transform: uppercase;
}

.dark .empty-state {
  background-color: #333;
  color: #ccc;
}
</style>
