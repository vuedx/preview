import { SFCDescriptor } from '@vuedx/compiler-sfc';
import * as FS from 'fs';
import * as Path from 'path';
import { ComponentResourceType, resourceToID, ResourceType } from './virtual-resource';

export function genPreviewIFrameContent(
  rootDir: string,
  resource: {
    fileName: string;
    index?: number | undefined;
  }
) {
  const fileName = Path.relative(rootDir, resource.fileName);
  const app = resourceToID({
    type: ComponentResourceType.ENTRY,
    fileName: fileName,
    index: resource.index,
  });

  return [
    `<!DOCTYPE html>`,
    `<html lang="en">`,
    `<head>`,
    `  <meta charset="UTF-8" />`,
    `  <meta name="viewport" content="width=device-width, initial-scale=1.0" />`,
    `  <title>Preview of ${fileName}</title>`,
    `</head>`,
    `<body>`,
    `  <div id="app">`,
    `    <div style="position: fixed; top: 0; bottom: 0; left: 0; right: 0; display: grid; place-content: center; background: white">Loading</div>  `,
    `  </div>`,
    `  <script type="module" src="/@vite/client"></script>`,
    `  <script type="module">import '/${app}'</script>`,
    `</body>`,
    `</html>`,
  ].join('\n');
}
export function genPreviewAppEntryScript(
  rootDir: string,
  resource: {
    type: ComponentResourceType;
    fileName: string;
    index?: number | undefined;
  },
  descriptor: SFCDescriptor
) {
  const instance = resourceToID({
    type: ComponentResourceType.COMPONENT,
    fileName: resource.fileName,
    index: resource.index,
  });
  const setup = ResourceType.USER_SETUP;
  const block = resource.index != null ? descriptor.customBlocks[resource.index] : null;

  return [
    `import { createApp, x } from '${setup}'`,
    `import { installFetchInterceptor } from '@vuedx/preview-provider'`,
    `import App from '${instance}'`,
    ``,
    `installFetchInterceptor()`,
    ``,
    `const app = createApp(App, ${JSON.stringify(block?.attrs ?? {})})`,
    `app.provide('preview:UserProviders', x)`,
    `app.mount('#app')`,
    ``,
  ].join('\n');
}
export function genVSCodeKeyboardEventSupport(): string {
  return `
const events = ['keydown', 'keyup'];
if (window.parent !== window.top) {
  events.forEach(event => {
    document.addEventListener(event, event => {
      window.parent.postMessage({
        kind: 'event',
        payload: {
          type: event.type,
          init: {
            altKey: event.altKey,
            code: event.code,
            ctrlKey: event.ctrlKey,
            isComposing: event.isComposing,
            key: event.key,
            location: event.location,
            metaKey: event.metaKey,
            repeat: event.repeat,
            shiftKey: event.shiftKey
          }
        }
      }, '*')
    })
  })
  window.addEventListener('message', event => {
    if (event.source === window) return
    window.postMessage(event.data, '*')
  }, false)
}
`;
}

export function genEntryHTML(shellBasePath: string) {
  const components = ResourceType.LIST_COMPONENTS;

  const html = FS.readFileSync(Path.resolve(shellBasePath, 'index.html'), 'utf-8').replace(
    '</body>',
    [
      `  <script type="module" src="/@vite/client"></script>`,
      `  <script type="module">import '/${components}'</script>`,
      `  <script>${genVSCodeKeyboardEventSupport()}</script>`,
      `</body>`,
    ].join('\n')
  );
  return html;
}
