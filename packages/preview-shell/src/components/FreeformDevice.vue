<script lang="ts" setup>
import { defineComponent, reactive, watch } from 'vue';
import BaseDevice from './BaseDevice.vue';

// @ts-ignore
import DeviceFreeformSVG from '../assets/device-freeform.svg';
function coerceInt(num: string | number, fallback: number): number {
  const n = parseInt(String(num));

  return Number.isInteger(n) ? n : fallback;
}

const props = defineProps({
  height: {
    type: Number,
    default: 256,
  },
  width: {
    type: Number,
    default: 256,
  },
  nocontrols: {
    type: Boolean,
    default: false,
  },
  noborder: {
    type: Boolean,
    default: false,
  },
});

const config = reactive({
  height: coerceInt(props.height, 256),
  width: coerceInt(props.width, 256),
});

watch(
  () => [props.width, props.height],
  ([width, height]) => {
    config.height = coerceInt(height, 256);
    config.width = coerceInt(width, 256);
  }
);
const bezels = { top: 16, left: 16, bottom: 16, right: 16 };
const image = `url("${DeviceFreeformSVG}")`;
const sizes = [
  128, 144, 196, 240, 256, 300, 320, 480, 512, 600, 800, 900, 1000, 1080, 1200, 1280, 1440,
];
</script>

<template>
  <div class="freeform-device" :style="{ maxWidth: config.width + 'px' }">
    <BaseDevice
      name="freeform"
      :height="config.height"
      :width="config.width"
      :bezels="bezels"
      :image="noborder ? '' : image"
    >
      <slot />
    </BaseDevice>
    <header v-if="!nocontrols">
      <div class="controls">
        <slot name="pre-controls" />
        <div class="whitespace-nowrap">
          <select v-model.number="config.width">
            <option v-for="size of sizes" :value="size">{{ size }}</option>
          </select>
          &times;
          <select v-model.number="config.height">
            <option v-for="size of sizes" :value="size">{{ size }}</option>
          </select>
        </div>
        <slot name="post-controls" />
      </div>
    </header>
  </div>
</template>

<style>
.freeform-device {
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.freeform-device .controls {
  position: relative;
  z-index: 100;
  opacity: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  margin-top: 0.5rem;
  gap: 1rem;
  background-color: white;
  padding: 8px;
  border-radius: 4px;
  width: fit-content;
  box-shadow: 0px 12px 7px -10px rgba(0, 0, 0, 0.75);
}

.freeform-device:hover .controls,
.freeform-device:focus-within .controls {
  opacity: 1;
}
</style>
