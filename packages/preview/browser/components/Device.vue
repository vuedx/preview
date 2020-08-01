<script lang="ts">
import { defineComponent, computed, ref, watch, inject } from 'vue';
import devices, { DeviceFrame } from '../devices';
import { ZOOM, THEME } from '../config';

export default defineComponent({
  props: {
    name: { type: String, required: true },
    type: { type: String, required: true },
    src: { type: String, required: true },
  },
  setup(props) {
    const zoom = ref(50);
    const theme = inject(THEME);
    const orientation = ref('portrait');
    const device = computed<DeviceFrame>(() => devices[props.type]);
    const scale = computed(() => zoom.value / 100);
    const backgroundColor = computed(() => (theme.value === 'dark' ? '#000' : '#fff'));

    const screen = computed(() => {
      const isLandscape = orientation.value === 'landscape';
      const zoom = scale.value;

      if (device.value) {
        const { width, height, offset } = device.value;

        if (isLandscape) {
          return {
            width: height,
            height: width,
            padding: `${offset.right}px ${offset.bottom}px ${offset.left}px ${offset.top}px`,
          };
        }

        return {
          width: width,
          height: height,
          padding: `${offset.top}px ${offset.right}px ${offset.bottom}px ${offset.left}px`,
        };
      }

      return { width: 400, height: 400, padding: 20 * zoom + 'px' };
    });
    const frame = computed(() => {
      const isLandscape = orientation.value === 'landscape';
      const zoom = scale.value;

      if (device.value) {
        const { width, height, offset, frame, screen: clip } = device.value;

        const w = (width + offset.left + offset.right) * zoom + 'px';
        const h = (height + offset.top + offset.bottom) * zoom + 'px';

        if (isLandscape) {
          return { width: h, height: w, bg: frame, clip };
        }

        return { width: w, height: h, bg: frame, clip };
      }

      return { width: 440 * zoom + 'px', height: 440 * zoom + 'px', bg: '' };
    });

    return { zoom, orientation, scale, frame, screen, backgroundColor };
  },
});
</script>

<template>
  <div class="container">
    <div v-if="name">
      <a class="name" :href="src" target="_blank">{{ name }}</a>
    </div>
    <div class="controls">
      <button @click="zoom = 25">25%</button>
      <button @click="zoom = 50">50%</button>
      <button @click="zoom = 100">100%</button>
      <button @click="zoom = 150">150%</button>
    </div>
    <div class="device" :style="frame">
      <div
        style="transform-origin: top left; box-sizing: content-box; background-size: 100% 100%;"
        :data-bg="frame.bg"
        :style="{
          transform: `scale(${scale})`,
          backgroundImage: `url(${frame.bg})`,
          padding: screen.padding,
          width: screen.width + 'px',
          height: screen.height + 'px',
        }"
      >
        <div :style="{ clipPath: frame.clip ? `url(${frame.clip}#c1)` : null }">
          <iframe
            :src="src"
            :width="screen.width"
            :height="screen.height"
            importance="high"
            loading="lazy"
            referrerpolicy="unsafe-url"
            style="border: none;"
            :style="{ backgroundColor: backgroundColor }"
          />
        </div>
      </div>
    </div>
    <div class="device-type">{{ type }}</div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
}

.controls {
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.controls * {
  cursor: pointer;
}

.device {
  margin: 0.5rem 0;
}

.device-type {
  font-size: 12px;
  color: #999;
}

a.name, a.name:visited {
  color: inherit;
  text-decoration: none;
}
</style>
