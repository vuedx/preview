<script lang="ts">
import { computed, defineComponent, reactive, ref, toRefs, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
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
    const router = useRouter();
    const current = toRefs(props).fileName;
    const filters = reactive<Record<string, Record<string, boolean>>>({});
    const component = computed(() => {
      const fileName = current?.value;
      return fileName != null ? components.value.find((component) => component.path === fileName) : undefined;
    });

    function toggleFilter(componentId: string, previewId: number) {
      filters[componentId] = {
        ...filters[componentId],
        [previewId]: !getFilter(componentId, previewId),
      };
    }

    function getFilter(componentId: string, previewId: number) {
      return filters[componentId]?.[previewId] ?? true;
    }

    function setCurrent(id: string) {
      const fileName = components.value.find((component) => component.id === id)?.path;

      router.push({ name: 'dashboard', query: { fileName } });
    }

    return { component, current, toggleFilter, getFilter, setCurrent };
  },
});
</script>

<template>
  <div class="flex flex-row flex-wrap">
    <aside
      class="fixed bg-white p-4 top-0 bottom-0 right-0 w-64 transform transition-transform duration-500 ease-in-out hover:translate-x-0 focus:translate-x-0 focus-within:translate-x-0 shadow-md"
      :class="component ? 'translate-x-60' : 'translate-x-0'"
    >
      <ExplorerComponents
        :active="current"
        @update:active="setCurrent($event)"
        #default="{ component }"
      >
        <ul :key="component.id" class="-mt-2 pb-2">
          <li v-for="preview of component.previews" :key="preview.id" class="mx-4">
            <label>
              <input
                type="checkbox"
                @change="toggleFilter(component.id, preview.id)"
                :checked="getFilter(component.id, preview.id)"
                :value="preview.id"
              />
              {{ preview.name }}
            </label>
          </li>
        </ul>
      </ExplorerComponents>
    </aside>
    <main class="w-full min-h-screen bg-gray-50 flex flex-row flex-wrap">
      <template v-if="component">
        <div class="pl-4 flex flow-row flex-wrap">
          <template v-if="component.previews.length > 0">
            <template v-for="preview of component.previews">
              <div v-if="getFilter(component.id, preview.id)" class="m-4">
                <Device :name="preview.device" v-bind="preview.deviceProps">
                  <Content :relativeFileName="component.path" :index="preview.id" />
                </Device>
              </div>
            </template>
          </template>
          <div v-else class="m-4">
            <Device name="freeform">
              <Content :relativeFileName="component.path" />
            </Device>
          </div>
        </div>
      </template>
      <div
        v-else
        class="grid place-content-center place-items-center w-screen h-screen text-3xl uppercase text-gray-500 bg-gray-900"
      >
        Select a component!
      </div>
    </main>
  </div>
</template>

<style>
.focus-within\:translate-x-0:focus-within {
  --tw-translate-x: 0;
}
</style>
