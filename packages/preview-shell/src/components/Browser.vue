<script lang="ts">
import { defineComponent } from 'vue';
import Viewport from './Viewport.vue';

export default defineComponent({
  props: {
    device: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
  },
  components: { Viewport },
});
</script>

<template>
  <div class="browser" :style="{ width: width + 'px', height: height + 'px' }">
    <Viewport :width="width" :height="height">
      <template #default="viewport">
        <slot v-bind="viewport" />
      </template>
    </Viewport>
  </div>
</template>

<style>
.browser {
  background-color: white;
}

.dark .browser {
  background-color: black;
}
</style>
