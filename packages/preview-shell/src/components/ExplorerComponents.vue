<script lang="ts">
import { computed, defineComponent } from 'vue';
import { components } from '../components';

export default defineComponent({
  props: {
    active: String,
  },

  emits: {
    'update:active': (value?: string) => true,
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
    <header class="font-bold uppercase text-xs text-gray-600 mb-2">Components</header>
    <ul class="-mx-4">
      <li
        v-for="component of components"
        :key="component.id"
        :class="{ 'shadow-inner bg-gray-200': component.id === current }"
      >
        <label
          class="py-2 px-4 block transition duration-500 ease-in-out cursor-pointer hover:bg-gray-200 focus:bg-gray-200 focus-within:bg-gray-200"
          :title="component.path"
        >
          <input type="radio" v-model="current" :value="component.id" class="sr-only" />
          {{ component.name }}
          <span
            class="block overflow-ellipsis overflow-x-hidden italic whitespace-nowrap -mt-1 text-gray-400 text-xs"
            >{{ component.path }}</span
          >
        </label>

        <slot v-if="component.id === current" :component="component" />
      </li>
    </ul>
  </section>
</template>
