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
    deviceFrame: { type: String, required: true },
    screenClipPath: { type: String },
    features: { type: Object as () => DeviceSpecs['features'], required: true },
    orientation: {
      type: String as () => DeviceSpecs['features']['orientation'][0],
      required: true,
    },
    style: { type: Object },
  },
  components: { Browser },
  inheritAttrs: false,
  setup(props, { attrs }) {
    const config = computed(() => {
      const { orientation, width, height, offset, style } = props;
      const transform = style?.transform || '';

      if (orientation === 'Landscape (left)') {
        return {
          width: height,
          height: width,
          device: {
            ...style,
            transform: `rotate(-90deg) ${transform}`,
          },
          screen: {
            transform: `rotate(90deg)`,
          },
        };
      }

      if (orientation === 'Landscape (right)') {
        return {
          width: height,
          height: width,
          device: {
            ...style,
            transform: `rotate(90deg) ${transform} `,
          },
          screen: {
            transform: `rotate(-90deg) translateX(${width - height}px)`,
          },
        };
      }

      return { width: width, height: height, device: style };
    });

    return { config };
  },
});
</script>

<template>
  <div
    class="device"
    :data-name="name"
    :style="[
      config.device,
      {
        paddingTop: offset.top + 'px',
        paddingRight: offset.right + 'px',
        paddingBottom: offset.bottom + 'px',
        paddingLeft: offset.left + 'px',
        backgroundImage: `url(${deviceFrame})`,
        width: width + 'px',
        height: height + 'px',
      },
    ]"
  >
    <div
      :style="{
        clipPath: screenClipPath ? `url(${screenClipPath}#c1)` : null,
        width: width + 'px',
        height: height + 'px',
        overflow: 'hidden',
      }"
    >
      <div :style="config.screen">
        <Browser :device="type" :width="config.width" :height="config.height">
          <template #default="browser">
            <slot v-bind="browser" />
          </template>
        </Browser>
      </div>
    </div>
  </div>
</template>

<style>
.device {
  box-sizing: content-box;
  background-size: 100% 100%;
}
</style>
