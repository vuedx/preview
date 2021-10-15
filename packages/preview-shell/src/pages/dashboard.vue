<script lang="ts" setup>
import { computed, defineComponent, reactive, ref, toRefs, watchEffect } from 'vue';
import { useRouter } from 'vue-router';
import { components } from '../components';
import Content from '../components/Content.vue';
import Device from '../components/Device.vue';
import ExplorerComponents from '../components/ExplorerComponents.vue';
import DeviceSelector from '../components/DeviceSelector.vue';
import ZoomSelector from '../components/ZoomSelector.vue';

const props = defineProps({
  fileName: String,
});

const router = useRouter();
const current = toRefs(props).fileName;
const filters = reactive<Record<string, Record<string, boolean>>>({});
const deviceOverride = ref<string | null>(null);
const zoomOverride = ref<number | null>(null);
const component = computed(() => {
  const fileName = current?.value;
  return fileName != null
    ? components.value.find((component) => component.path === fileName)
    : undefined;
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

function setCurrent(fileName: string) {
  router.push({ name: 'dashboard', query: { fileName } });
}
</script>

<template>
  <div class="flex flex-row flex-wrap">
    <aside
      class="
        fixed
        top-0
        bottom-0
        right-0
        transform
        transition-transform
        duration-500
        ease-in-out
        hover:translate-x-0
        focus:translate-x-0
        focus-within:translate-x-0
        overflow-auto
        z-50
        w-72
      "
      :class="component ? 'translate-x-60' : 'translate-x-0'"
      style="overscroll-behavior: contain"
    >
      <div class="bg-white w-60 ml-12 p-4 shadow-md min-h-screen">
        <ExplorerComponents :active="current" @update:active="setCurrent($event)"
          ><template #controls>
            <fieldset class="border border-solid border-gray-300 p-3 mt-1">
              <legend class="text-xs text-gray-500 px-2">Global Overrides</legend>
              <label class="whitespace-nowrap flex gap-3 text-xs py-2 cursor-pointer">
                Device:
                <DeviceSelector class="flex-1" v-model="deviceOverride" allowNull />
              </label>
              <label class="whitespace-nowrap flex gap-3 text-xs py-2 cursor-pointer">
                Zoom:
                <ZoomSelector class="flex-1" v-model="zoomOverride" allowNull />
              </label>
            </fieldset>
          </template>
          <template #selected="{ component }">
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
          </template>
        </ExplorerComponents>
      </div>
    </aside>
    <main class="w-screen min-h-screen bg-gray-50">
      <template v-if="component">
        <div class="px-4 flex flow-row flex-wrap gap-4">
          <template v-if="component.previews.length > 0">
            <template v-for="preview of component.previews">
              <div v-if="getFilter(component.id, preview.id)" class="m-4" :title="preview.name">
                <Device
                  :name="deviceOverride ?? preview.device"
                  v-bind="preview.deviceProps"
                  :zoom="zoomOverride"
                >
                  <template #default>
                    <Content :relativeFileName="component.path" :index="preview.id" />
                  </template>
                  <template #controls>
                    <a
                      :href="`/__preview:iframe/${component.path}?index=${preview.id}`"
                      title="Open in new tab"
                      target="_blank"
                    >
                      <svg style="width: 24px; height: 24px" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"
                        /></svg
                    ></a>
                  </template>
                </Device>
              </div>
            </template>
          </template>
          <div v-else class="m-4">
            <Device :name="deviceOverride ?? 'freeform'">
              <template #default>
                <Content :relativeFileName="component.path" />
              </template>

              <template #controls>
                <a
                  :href="`/__preview:iframe/${component.path}`"
                  title="Open in new tab"
                  target="_blank"
                >
                  <svg style="width: 24px; height: 24px" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"
                    /></svg
                ></a>
              </template>
            </Device>
          </div>
        </div>
      </template>
      <div
        v-else
        class="
          grid
          place-content-center place-items-center
          w-screen
          h-screen
          text-3xl
          uppercase
          text-gray-500
          bg-gray-900
        "
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
