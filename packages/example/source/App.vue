<script>
import { ref, defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const repos = ref([]);

    fetch('https://api.github.com/users/znck/repos')
      .then((response) => response.json())
      .then((result) => {
        repos.value = result;
      });

    return { repos };
  },
});
</script>

<template>
  <ul class="bg-white">
    <li v-for="repo of repos" class="px-4 py-2">
      {{ repo.name }}
    </li>
  </ul>
</template>

<preview>
  <setup :requests="{
    'https://api.github.com/users/znck/repos': [{name: 'preview'}]
  }" />

  <App />
</preview>
