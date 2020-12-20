<script lang="ts">
import { computed, defineComponent, reactive, ref, watchEffect } from 'vue';
import { components } from '../components';
import Content from '../components/Content.vue';
import Device from '../components/Device.vue';
import ExplorerComponents from '../components/ExplorerComponents.vue';

export default defineComponent({
  props: {
    fileName: String,
  },

  components: {
    ExplorerComponents,
    Device,
    Content,
  },

  setup(props) {
    const current = ref<string>(props.fileName);
    const filters = reactive({});
    const component = computed(() => {
      const id = current.value;
      return id != null ? components.value.find((component) => component.id === id) : undefined;
    });

    watchEffect(() => {
      if (props.fileName) {
        current.value = props.fileName;
      }
    });

    if (current.value == null && components.value.length > 0) {
      current.value = components.value[0].id;
    }

    function toggleFilter(componentId: string, previewId: number) {
      filters[componentId] = {
        ...filters[componentId],
        previewId: !getFilter(componentId, previewId),
      };
    }

    function getFilter(componentId: string, previewId: number) {
      return filters[componentId]?.[previewId] ?? true;
    }

    return { component, current, toggleFilter, getFilter };
  },
});
</script>

<template>
  <div class="dashboard">
    <aside class="sidebar">
      <ExplorerComponents v-model:active="current" #default="{ component }">
        <ul :key="component.id">
          <li v-for="preview of component.previews" :key="preview.id">
            <label>
              <input
                type="checkbox"
                @change="toggleFilter(component.id, preview.index)"
                :checked="getFilter(component.id, preview.index)"
                :value="preview.index"
              />
              {{ preview.name ?? `Preview ${preview.index}` }}
            </label>
          </li>
        </ul>
      </ExplorerComponents>
    </aside>
    <main class="previews">
      <template v-if="component">
        <template v-if="component.previews.length > 0">
          <template v-for="story of component.previews" :name="story.device">
            <Device v-if="getFilter(component.id, story.id)" :name="story.device">
              <Content :relativeFileName="component.path" :story="story.index" />
            </Device>
          </template>
        </template>
        <Device v-else name="freeform">
          <Content :relativeFileName="component.path" story="" />
        </Device>
      </template>
      <div v-else class="empty-state">Select a component!</div>
    </main>
  </div>
</template>

<style>
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
  box-sizing: border-box;
  gap: 1rem;
  padding: 1rem;
  padding-bottom: 4rem;
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
