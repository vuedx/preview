<script lang="ts" setup>
import { computed, ref, unref } from 'vue';
import { components } from '../components';

const props = defineProps({
  active: String,
});

const emit = defineEmits({
  'update:active': (value?: string) => true,
});

const search = ref('');
const current = computed({
  get: () => props.active,
  set: (value) => emit('update:active', value),
});

const filtered = computed(() => {
  const text = unref(search).toLowerCase();
  const items = unref(components);

  if (text === '') {
    const collator = new Intl.Collator(undefined, {
      usage: 'sort',
      sensitivity: 'base',
      numeric: true,
    });
    items.sort((a, b) => collator.compare(a.name, b.name));
    return items;
  }

  const collator = new Intl.Collator(undefined, {
    usage: 'search',
    sensitivity: 'base',
    numeric: true,
  });
  items.sort((a, b) => collator.compare(a.name, b.name));
  const included = new Set<string>();

  return [
    ...items.filter((item) => {
      if (item.name.toLowerCase().match(text)) {
        included.add(item.id);
        return true;
      }
      return false;
    }),
    ...items.filter((item) => !included.has(item.id) && item.path.toLowerCase().match(text)),
  ];
});
</script>

<template>
  <section>
    <header class="bg-white -mt-4 -mx-4 px-4 pt-4 pb-2 sticky top-0">
      <h1 class="font-bold uppercase text-xs text-gray-600">Components</h1>

      <form @submit.prevent>
        <input
          type="search"
          v-model="search"
          class="searchfield border py-1 px-2 w-full mt-1 rounded text-xs"
          placeholder="Filter components..."
        />

        <slot name="controls" />
      </form>
    </header>
    <ul class="-mx-4">
      <li
        v-for="component of filtered"
        :key="component.id"
        :class="{ 'shadow-inner bg-gray-200 sticky': component.path === current }"
        style="top: 179px; bottom: 0px"
      >
        <label
          class="
            py-2
            px-4
            block
            transition
            duration-500
            ease-in-out
            cursor-pointer
            hover:bg-gray-200
            focus:bg-gray-200
            focus-within:bg-gray-200
          "
          :title="component.path"
        >
          <input type="radio" v-model="current" :value="component.path" class="sr-only" />
          {{ component.name }}
          <span
            class="
              block
              overflow-ellipsis overflow-x-hidden
              italic
              whitespace-nowrap
              -mt-1
              text-gray-400 text-xs
            "
            >{{ component.path }}</span
          >
        </label>

        <slot v-if="component.path === current" :component="component" name="selected" />
      </li>
    </ul>
  </section>
</template>

<style>
.searchfield {
  appearance: searchfield;
}
</style>
