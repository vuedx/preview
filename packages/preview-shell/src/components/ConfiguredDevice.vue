<script lang="ts">
import { computed, defineComponent, PropType, ref, watch } from 'vue';
import type { DeviceSpecs } from '../devices';
import BaseDevice from './BaseDevice.vue';
import ZoomSelector from './ZoomSelector.vue';
export default defineComponent({
  components: { BaseDevice, ZoomSelector },
  props: {
    device: {
      type: null as unknown as PropType<DeviceSpecs>,
      required: true,
    },
    zoom: {
      type: Number,
    },
  },
  setup(props) {
    const levels = [25, 50, 67, 80, 90, 100, 110, 120, 133, 150, 170, 200, 240, 300];
    const zoom = ref(props.zoom ?? 50);
    const orientation = ref('default');

    const offsetSize = computed(() => {
      if (orientation.value === 'landscape') {
        return {
          width: props.device.height + props.device.bezels.top + props.device.bezels.bottom,
          height: props.device.width + props.device.bezels.left + props.device.bezels.right,
        };
      }

      return {
        height: props.device.height + props.device.bezels.top + props.device.bezels.bottom,
        width: props.device.width + props.device.bezels.left + props.device.bezels.right,
      };
    });

    const size = computed(() => {
      if (orientation.value === 'landscape') {
        return { height: props.device.width, width: props.device.height };
      }
      return { width: props.device.width, height: props.device.height };
    });

    function autoZoom() {
      try {
        if (!Number.isFinite(props.zoom)) {
          const expected = Math.min(
            (window.innerHeight / size.value.height) * 48,
            (window.innerWidth / size.value.width) * 48
          );
          const index = levels.findIndex((level) => level > expected);
          zoom.value = levels[Math.max(0, index - 1)]!;
        }
      } catch {}
    }

    autoZoom();

    watch(
      () => props.zoom,
      (value) => {
        if (value == null) {
          autoZoom();
        } else {
          zoom.value = value;
        }
      }
    );

    const orientedBezels = computed(() => {
      if (orientation.value === 'landscape') {
        return {
          top: props.device.bezels.right,
          right: props.device.bezels.bottom,
          bottom: props.device.bezels.left,
          left: props.device.bezels.top,
        };
      }
      return props.device.bezels;
    });

    return { orientedBezels, size, offsetSize, levels, orientation, zoom };
  },
});
</script>

<template>
  <div class="configured-device" :style="{ maxWidth: `${(offsetSize.width * zoom) / 100}px` }">
    <div
      :style="{
        height: `${(offsetSize.height * zoom) / 100}px`,
        width: `${(offsetSize.width * zoom) / 100}px`,
        overflow: 'hidden',
      }"
    >
      <div
        :style="{
          display: 'inline-block',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'top left',
        }"
      >
        <BaseDevice
          :name="device.name"
          :width="size.width"
          :height="size.height"
          :bezels="orientedBezels"
          :image="device.frames[orientation].photo"
          :screenPath="device.frames[orientation].mask"
        >
          <slot />
        </BaseDevice>
      </div>
    </div>

    <header>
      <div class="controls">
        <slot name="pre-controls" />

        <ZoomSelector v-model="zoom" />

        <div class="orientation" v-if="device.frames.landscape">
          <select v-model="orientation">
            <option value="default">Portrait</option>
            <option value="landscape">Landsape</option>
          </select>
        </div>

        <slot name="post-controls" />
      </div>
    </header>
  </div>
</template>

<style>
.configured-device {
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.configured-device .controls {
  position: relative;
  z-index: 100;
  opacity: 0;
  display: flex;
  flex-direction: row;
  margin-top: 0.5rem;
  gap: 1rem;
  background-color: white;
  padding: 8px;
  border-radius: 4px;
  width: fit-content;
  box-shadow: 0px 12px 7px -10px rgba(0, 0, 0, 0.75);
}

.configured-device:hover .controls,
.configured-device:focus-within .controls {
  opacity: 1;
}
</style>
