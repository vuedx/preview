<script lang="ts">
import { computed, defineComponent } from 'vue';
import { components } from '../components';

export default defineComponent({
  props: {
    active: String,
  },

  emits: {
    'update:active': (value: string) => true,
  },

  setup(props, { emit }) {
    const current = computed({
      get: () => props.active,
      set: (value) => emit('update:active', value),
    });

    return { current, components };
  },
});
</script>

<template>
  <section>
    <header class="bg-red-500">Components</header>
    <ul>
      <li v-for="component of components" :key="component.id">
        <label>
          <input type="radio" v-model="current" :value="component.id" />
          {{ component.name }}
        </label>

        <slot v-if="component.id === current" :component="component" />
      </li>
    </ul>
  </section>
</template>
