<template>
  <button class="bg-blue-500 py-2 px-4 text-white rounded">
    <!-- @slot content of the button -->
    <slot />
  </button>
</template>

<preview name="Primary Button">
  <Button>Hello 1</Button>
</preview>

<preview device="desktop" name="Button">
  <Button>Hello 2</Button>
</preview>
