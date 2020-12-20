<template>
  <button class="bg-blue-500 hover:bg-red-500 py-2 px-4 text-white rounded">
    <!-- @slot content of the button -->
    <slot />
  </button>
</template>


<preview>
  <Button>Click Me!!</Button>
</preview>


<preview device="phone">
  <Button>Click Me!!</Button>
</preview>

<preview device="tablet">
  <Button>Click Me!!</Button>
</preview>

<preview device="desktop">
  <Button>Click Me!!</Button>
</preview>

