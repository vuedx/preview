<div align="center" style="margin-bottom: 72px">

<img src="./extension/logo.png" width="172" />

</div>

# VueDX/Preview

**Preview** is a UI feedback tool built on top Vite.

## Features

- Render any component in a sandbox environment
- Responsive previews of a component
- Use `<preview>` blocks as unit test fixtures/examples

## Getting Started

### VS Code

- Install [Preview](https://marketplace.visualstudio.com/items?itemName=znck.preview) extension.
- When editor is focused on a `.vue` file, you can
  - Run `Preview: Show preview` command
  - Click on ![Show Preview](./docs/assets/show-preview.svg) button on editor tab.

### Vite

- Install `@vuedx/preview` as dev dependency
  ```
  npm add -D @vuedx/preview
  ```
- Add plugin to vite config file

  ```ts
  import VuePlugin from '@vitejs/plugin-vue';
  import { PreviewPlugin } from '@vuedx/preview';

  export default {
    plugins: [VuePlugin(), PrevivewPlugin()],
  };
  ```

### Standalone

- Run `npx -y @vuedx/preview` in root directory of a Vue project

## Guide

### Defining Previews

Use `<preview>` custom block to define previews. e.g.

```vue
<script setup>
const props = defineProps({
  type: String,
});
</script>

<template>
  <button :class="type">
    <slot />
  </button>
</template>

<preview name="Primary">
  <Button type="primary">Primary Button</Button>
</preview>

<preview name="Secondary">
  <Button type="secondary">Secondary Button</Button>
</preview>
```

We try to generate previews when no `<preview>` blocks are defined. However, the automatic generation is trivial and only works for simpler cases for now.

We are exploring automatic generation using static code analysis, and **active looking for feedback**. You can help us by creating issues when generated preview is not helpful or any suggestions that might improve previews.

### Mocking HTTP Requests

> TODO: document this.

### Importing components in previews

> TODO: document this.

### Using previews for unit tests

> TODO: document this.

## Known Limitations

1. Using `<preview>` blocks could create noise and editor tools like "search in all files" would be difficult to use. We want to explore alternative to `<preview>` block:
   - Using `.preview` file next to `.vue` file using same SFC-like structure

## Support

This package is part of [VueDX project](https://github.com/znck/vue-developer-experience), maintained by [Rahul Kadyan](https://github.com/znck). You can [💖 sponsor him](https://github.com/sponsors/znck) for continued development of this package and other VueDX tools.
