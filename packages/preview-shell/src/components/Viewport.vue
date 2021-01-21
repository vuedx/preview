<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
});
</script>

<template>
  <div class="viewport">
    <slot :width="width" :height="height" />
  </div>
</template>
