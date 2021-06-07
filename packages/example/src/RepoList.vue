<script>
import { ref, defineComponent } from 'vue';

export default defineComponent({
  setup() {
    const repos = ref(
      /** @type {Array<{ name: string }>} */ ([])
    );

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
    <li v-for="(repo, index) of repos" class="px-4 py-2">
      {{ repo.name }}
    </li>
  </ul>
</template>

<preview name="one repo">
  <setup :requests="{
    'https://api.github.com/users/znck/repos': [
      {name: 'preview'},
    ]
  }" />

  <RepoList />
</preview>
