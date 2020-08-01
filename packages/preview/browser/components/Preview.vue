<script lang="ts">
import {
  defineComponent,
  ref,
  computed,
  inject,
  onMounted,
  watchEffect,
  ComponentPublicInstance,
} from 'vue';
import Device from './Device.vue';
import devices from '../devices';
import { THEME } from '../config';

export default defineComponent({
  props: {
    name: { type: String, required: true },
    device: { type: String, required: true },
    src: { type: String, required: true },
  },
  components: { Device },
  setup(props) {
    const zoom = ref(50);
    const orientation = ref('Portrait');
    const theme = inject(THEME)!;
    const deviceInfo = computed(() => devices[props.device]);

    const containerRef = ref<HTMLDivElement>(null);
    const elementRef = ref<ComponentPublicInstance>(null);
    watchEffect(function resize() {
      orientation.value, zoom.value; // explicit dependency.
      if (containerRef.value && elementRef.value) {
        const { width, height } = elementRef.value.$el.getBoundingClientRect();
        containerRef.value.style.width = width + 'px';
        containerRef.value.style.height = height + 'px';
      }
    });

    return { zoom, orientation, deviceInfo, containerRef, elementRef };
  },
});
</script>

<template>
  <section class="preview">
    <header>
      <div class="name" v-if="name">
        {{ name }}
        <a :href="src" target="_blank"
          ><svg
            style="width: 1em; height: 1em;"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            ></path></svg
        ></a>
      </div>

      <div class="controls">
        <button @click="zoom = 25">25%</button>
        <button @click="zoom = 50">50%</button>
        <button @click="zoom = 100">100%</button>
        <button @click="zoom = 150">150%</button>
      </div>

      <div class="orientation" v-if="deviceInfo && deviceInfo.features.orientation">
        <select v-model="orientation">
          <option
            v-for="option of deviceInfo.features.orientation"
            :key="option"
            :value="option"
            style="text-transform: capitalize;"
            >{{ option }}</option
          >
        </select>
      </div>
    </header>

    <div class="content" v-if="deviceInfo" ref="containerRef">
      <div
        class="scaler"
        :style="{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
        }"
      >
        <Device
          ref="elementRef"
          #default="{ width, height }"
          v-bind="deviceInfo"
          :orientation="orientation"
        >
          <iframe
            referrerpolicy="unsafe-url"
            style="border: none;"
            :src="src"
            :width="width"
            :height="height"
          />
        </Device>
      </div>
    </div>

    <footer v-if="deviceInfo">
      {{ deviceInfo.name }}
    </footer>
  </section>
</template>

<style>
.preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}

.preview > header {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview > .content {
  margin: 0.5rem 0;
  overflow: hidden;
}

.preview > footer {
  font-size: 12px;
  color: #999;
}

.preview .controls {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.preview .controls > button {
  cursor: pointer;
}

.preview a {
  color: inherit;
}

.preview .scaler {
  width: fit-content;
  width: -moz-fit-content;
  height: fit-content;
  height: -moz-fit-content;
}
</style>
