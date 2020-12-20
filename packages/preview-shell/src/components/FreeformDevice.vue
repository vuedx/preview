<script lang="ts">
import { defineComponent, reactive } from 'vue';
import BaseDevice from './BaseDevice.vue';

// @ts-ignore
import DeviceFreeformSVG from '../assets/device-freeform.svg';

export default defineComponent({
  components: { BaseDevice },
  setup() {
    const config = reactive({
      height: 256,
      width: 256,
    });
    const bezels = { top: 16, left: 16, bottom: 16, right: 16 };
    const image = `url("${DeviceFreeformSVG}")`;
    const sizes = [
      128,
      144,
      196,
      240,
      256,
      300,
      320,
      480,
      512,
      600,
      800,
      900,
      1000,
      1080,
      1200,
      1280,
      1440,
    ];

    return { sizes, bezels, image, config };
  },
});
</script>

<template>
  <div class="freeform-device">
    <BaseDevice
      name="freeform"
      :height="config.height"
      :width="config.width"
      :bezels="bezels"
      image=""
      style="background-color: #f7e9d4; border: 2px dashed #b27603; border-radius: 16px;"
    >
      <slot />
    </BaseDevice>
    <header>
      <div class="controls">
        <select v-model.number="config.width">
          <option v-for="size of sizes" :value="size">{{ size }}</option>
        </select>
        &times;
        <select v-model.number="config.height">
          <option v-for="size of sizes" :value="size">{{ size }}</option>
        </select>
      </div>
    </header>
  </div>
</template>

<style>
.freeform-device {
  display: flex;
  flex-direction: column;
}

.controls {
  opacity: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  margin-top: 0.5rem;
  gap: 1rem;
}

.freeform-device:hover .controls,
.freeform-device:focus-within .controls {
  opacity: 1;
}
</style>
