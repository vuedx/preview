<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: {
    type: Number,
  },
  allowNull: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const levels = [25, 50, 67, 80, 90, 100, 110, 120, 133, 150, 170, 200, 240, 300];
const zoom = computed({
  get: () => (props.modelValue == null ? '' : String(props.modelValue)),
  set: (value: string) => emit('update:modelValue', value ? parseInt(value) : null),
});
</script>

<template>
  <select v-model="zoom">
    <option v-if="allowNull"></option>
    <option v-for="level of levels" :value="level">{{ level }}%</option>
  </select>
</template>
