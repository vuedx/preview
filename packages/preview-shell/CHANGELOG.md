# @vuedx/preview-shell

## 0.3.1

### Patch Changes

- d74efa5: Global overrides for device and zoom
- d74efa5: Filter components

## 0.3.0

### Minor Changes

- ff930e3: Use `/__preview` path prefix for plugin mode

  BREAKING CHANGE: Internal virtual files also use `__preview` prefix, instead of `@preview`.

## 0.2.2

### Patch Changes

- dd448e6: Support async imports in `<preview>` blocks
- dd448e6: Sync color-scheme with VS Code

## 0.2.1

### Patch Changes

- b0eea6a: Build using @vuedx/monorepo-tools

## 0.2.0

### Minor Changes

- b03452d: Add HMR support

## 0.1.4

### Patch Changes

- 83e89e5: Use consistent virtual resource scheme

  - Use `@preview:component/${type}.${ext}` for component scoped resources
  - Use `@preview:shell/` for proxying pre-built shell application
  - Use `@preview:components.js` for component index
  - Use `@preview:user/setup.js` for custom runtime setup file

## 0.1.3

### Patch Changes

- 1b39181: Bump all versions to test continuous release CI

## 0.1.2

### Patch Changes

- 18a1b02: Fix build in release pipeline

## 0.1.1

### Patch Changes

- e3ba132: Update HMR API

  - Version lock on vite@2.0.0-beta.44
  - Remove forked HMR client and use `/@vite/client` instead

## 0.1.0

### Minor Changes

- d34a262: VS Code preview extension
