<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  name: 'Content',
  props: {
    relativeFileName: { type: String, required: true },
    index: { type: Number },
  },

  setup(props) {
    const src = computed(
      () => `/__preview:iframe/${props.relativeFileName}?index=${props.index ?? ''}`
    );

    return { src };
  },
});
</script>

<template>
  <iframe referrerpolicy="unsafe-url" style="border: none" :src="src" width="100%" height="100%" />
</template>
