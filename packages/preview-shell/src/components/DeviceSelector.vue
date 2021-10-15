<script lang="ts">
import { defineComponent } from 'vue';
import { devices } from '../devices';

export default defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: { type: String },
    allowNull: { type: Boolean, default: false },
  },

  setup() {
    return { devices };
  },
});
</script>

<template>
  <select @change="$emit('update:modelValue', $event.target?.value || null)" placeholder="...">
    <option :disabled="!allowNull" :selected="modelValue == null"></option>
    <option value="freeform" :selected="modelValue === 'freeform'">Freeform</option>
    <option
      v-for="device of devices"
      :value="device.aliases[0]"
      :selected="modelValue != null && device.aliases.includes(modelValue)"
    >
      {{ device.name }}
    </option>
  </select>
</template>
