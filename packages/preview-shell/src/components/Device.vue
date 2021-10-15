<script lang="ts">
import ConfiguredDevice from './ConfiguredDevice.vue';
import BaseDevice from './BaseDevice.vue';
import DeviceSelector from './DeviceSelector.vue';
import { computed, defineComponent, ref, watch } from 'vue';
import FreeformDevice from './FreeformDevice.vue';

import devicesMap, { devices } from '../devices';
export default defineComponent({
  inheritAttrs: false,
  props: {
    name: { type: String, default: 'freeform' },
  },
  components: {
    ConfiguredDevice,
    BaseDevice,
    DeviceSelector,
    FreeformDevice,
  },
  setup(props) {
    const current = ref(props.name);
    const device = computed(() => devicesMap[current.value]);
    watch(
      () => props.name,
      (name) => {
        current.value = name;
      }
    );

    return { device, devices, current };
  },
});
</script>

<template>
  <component
    :is="device != null ? 'ConfiguredDevice' : 'FreeformDevice'"
    v-bind="$attrs"
    :device="device"
  >
    <template #default>
      <slot />
    </template>

    <template #pre-controls>
      <DeviceSelector v-model="current" />
    </template>

    <template #post-controls>
      <slot name="controls" />
    </template>
  </component>
</template>
