<script lang="ts">
import { computed, defineComponent } from 'vue';

export default defineComponent({
  props: {
    relativeFileName: { type: String, required: true },
    story: { type: [String, Number] },
  },

  setup(props) {
    const src = computed(
      () =>
        `/@preview/component-story.html?fileName=${encodeURIComponent(
          props.relativeFileName
        )}&story=${encodeURIComponent(props.story ?? '')}`
    );

    return { src };
  },
});
</script>

<template>
  <iframe referrerpolicy="unsafe-url" style="border: none;" :src="src" width="100%" height="100%" />
</template>
