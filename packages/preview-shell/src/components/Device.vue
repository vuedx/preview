<script lang="ts">
import ConfiguredDevice from './ConfiguredDevice.vue';
import BaseDevice from './BaseDevice.vue';
import { computed, defineComponent } from 'vue';
import FreeformDevice from './FreeformDevice.vue';

import devices from '../devices';
export default defineComponent({
  inheritAttrs: false,
  props: {
    name: { type: String, default: 'freeform' },
  },
  components: {
    ConfiguredDevice,
    BaseDevice,
    FreeformDevice,
  },
  setup(props) {
    const device = computed(() => devices[props.name]);

    return { device, devices };
  },
});
</script>

<template>
  <FreeformDevice v-if="name === 'freeform'" v-bind="$attrs">
    <slot />
  </FreeformDevice>
  <template v-else-if="device">
    <ConfiguredDevice v-bind="$attrs" :device="device">
      <slot />
    </ConfiguredDevice>
  </template>
  <div v-else>
    Error: Unsupported device: {{ name }}

    <pre>Configured Devices: {{ Array.from(Object.keys(devices)) }}</pre>
  </div>
</template>
