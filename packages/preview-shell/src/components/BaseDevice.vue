<script lang="ts">
import { defineComponent } from 'vue';
import { DeviceSpecs } from '../devices';

export default defineComponent({
  props: {
    name: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bezels: {
      type: Object as () => DeviceSpecs['bezels'],
      default: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
    },
    image: { type: String },
    screenPath: { type: String },
  },
});
</script>

<template>
  <div
    class="device fit-content"
    :data-name="name"
    :style="{
      backgroundImage: image,
      padding: `${bezels.top}px ${bezels.right}px ${bezels.bottom}px ${bezels.left}px`,
    }"
  >
    <div
      class="fit-content"
      :style="{
        overflow: 'hidden',
        clipPath: screenPath,
      }"
      :data-mask="screenPath"
    >
      <div class="screen" :style="{ width: `${width}px`, height: `${height}px` }">
        <slot />
      </div>
    </div>
  </div>
</template>

<style>
.device {
  box-sizing: content-box;
  background-size: 100% 100%;
}

.screen {
  background-color: #030309;
}

@media (prefers-color-scheme: light) {
  .screen {
    background-color: #fff;
  }
}

[color-scheme='dark'] .screen {
  background-color: #030309;
}

[color-scheme='light'] .screen {
  background-color: #fff;
}

.fit-content {
  display: inline-block;
  width: -moz-fit-content;
  width: fit-content;
  height: -moz-fit-content;
  height: fit-content;
}
</style>
