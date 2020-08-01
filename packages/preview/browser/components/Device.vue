<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import Browser from './Browser.vue';
import { DeviceSpecs } from '../devices';

export default defineComponent({
  props: {
    name: { type: String, required: true },
    type: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    offset: {
      type: Object as () => DeviceSpecs['offset'],
      default: () => ({ top: 0, left: 0, bottom: 0, right: 0 }),
    },
    frames: {
      type: Object as () => DeviceSpecs['frames'],
      required: true,
    },
    touch: Boolean,
    orientation: {
      type: String,
      required: true,
    },
  },
  components: { Browser },
  setup(props, { attrs }) {
    const config = computed(() => {
      const { orientation, width, height, offset, frames } = props;

      if (orientation === 'landscape' && frames.landscape) {
        return {
          width: height,
          height: width,
          mask: frames.landscape.mask,
          style: {
            backgroundImage: `url(${frames.landscape.photo})`,
            paddingTop: offset.right + 'px',
            paddingRight: offset.bottom + 'px',
            paddingBottom: offset.left + 'px',
            paddingLeft: offset.top + 'px',
          },
        };
      }

      return {
        width: width,
        height: height,
        mask: frames.default.mask,
        style: {
          backgroundImage: `url(${frames.default.photo})`,
          paddingTop: offset.top + 'px',
          paddingRight: offset.right + 'px',
          paddingBottom: offset.bottom + 'px',
          paddingLeft: offset.left + 'px',
        },
      };
    });

    return { config };
  },
});
</script>

<template>
  <div class="device" :data-name="name" :style="config.style">
    <div
      :style="{
        clipPath: config.mask,
        width: 'fit-content',
        height: 'fit-content',
        overflow: 'hidden',
      }"
    >
      <Browser :device="type" :width="config.width" :height="config.height">
        <template #default="browser">
          <slot v-bind="browser" />
        </template>
      </Browser>
    </div>
  </div>
</template>

<style>
.device {
  box-sizing: content-box;
  background-size: 100% 100%;
}
</style>
