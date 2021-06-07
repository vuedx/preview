---
'@vuedx/preview': patch
'@vuedx/preview-shell': patch
'preview': patch
---

Use consistent virtual resource scheme

- Use `@preview:component/${type}.${ext}` for component scoped resources
- Use `@preview:shell/` for proxying pre-built shell application
- Use `@preview:components.js` for component index
- Use `@preview:user/setup.js` for custom runtime setup file
