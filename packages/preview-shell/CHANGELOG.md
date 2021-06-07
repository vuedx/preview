# @vuedx/preview-shell

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
