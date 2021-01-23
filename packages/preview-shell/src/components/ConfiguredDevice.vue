<script lang="ts">
import devices, { DeviceSpecs } from '../devices';
import { computed, defineComponent, onMounted, PropType, ref } from 'vue';
import BaseDevice from './BaseDevice.vue';
export default defineComponent({
  components: { BaseDevice },
  props: {
    device: {
      type: (null as unknown) as PropType<DeviceSpecs>,
      required: true,
    },
  },
  setup(props) {
    const levels = [25, 50, 67, 80, 90, 100, 110, 120, 133, 150, 170, 200, 240, 300];
    const zoom = ref(50);
    const orientation = ref('default');

    try {
      const expected = Math.min(
        (window.innerHeight / props.device.height) * 80,
        (window.innerWidth / props.device.width) * 80
      );
      const index = levels.findIndex((level) => level > expected);
      zoom.value = levels[Math.max(0, index - 1)];
    } catch {}

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
  <div class="configured-device">
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
        <select v-model.number="zoom">
          <option v-for="level of levels" :value="level">{{ level }}%</option>
        </select>

        <div class="orientation" v-if="device.frames.landscape">
          <select v-model="orientation">
            <option value="default">Portrait</option>
            <option value="landscape">Landsape</option>
          </select>
        </div>
      </div>
    </header>
  </div>
</template>

<style>
.configured-device {
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

.configured-device:hover .controls,
.configured-device:focus-within .controls {
  opacity: 1;
}
</style>
