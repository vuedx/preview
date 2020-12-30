import FS from 'fs';
import Path from 'path';
import { URL } from 'url';
import { ModuleNode, Plugin, send } from 'vite';
import { PropInfo } from '@vuedx/analyze';
import { ComponentMetadataStore } from './store/ComponentMetadataStore';
import { PreviewCompilerStore } from './store/PreviewCompilerStore';
import glob from 'fast-glob';
import { DescriptorStore } from './store/DescriptorStore';
import { SFCBlock, SFCDescriptor } from '@vuedx/compiler-sfc';

interface PreviewSelector {
  fileName: string;
  index?: number;
}
function isEqualBlock(a: SFCBlock | null, b: SFCBlock | null) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  // src imports will trigger their own updates
  if (a.src && b.src && a.src === b.src) return true;
  if (a.content !== b.content) return false;
  const keysA = Object.keys(a.attrs);
  const keysB = Object.keys(b.attrs);
  if (keysA.length !== keysB.length) {
    return false;
  }
  return keysA.every((key) => a.attrs[key] === b.attrs[key]);
}

function isOnlyPreviewChanged(a: SFCDescriptor, b: SFCDescriptor): boolean {
  return (
    !isEqualBlock(a.template, b.template) ||
    !isEqualBlock(a.script, b.script) ||
    a.styles.length !== b.styles.length ||
    !a.styles.every((style, index) => isEqualBlock(style, b.styles[index])) ||
    !a.customBlocks.every((customBlock, index) => {
      if (customBlock.type === 'preview') return true;
      return isEqualBlock(customBlock, b.customBlocks[index]);
    })
  );
}
function getPreviewSelector(path: string): PreviewSelector {
  const [fileName, query] = path.split('?');
  const result: PreviewSelector = { fileName: fileName.replace(/\/@preview:.*?\//, '') };
  const match = /index=(\d+)/.exec(query);
  if (match) {
    const index = parseInt(match[1]);
    if (!Number.isNaN(index)) result.index = index;
  }
  return result;
}

function getComponentName(fileName: string): string {
  const name = Path.basename(fileName)
    .replace(/\.vue$/, '')
    .replace(/[^a-z0-9]+([a-z])/i, (_, char) => char.toUpperCase());

  return name.charAt(0).toUpperCase() + name.substr(1);
}

function getPropValue(prop: PropInfo): string {
  if (prop.defaultValue != null) {
    switch (prop.defaultValue.kind) {
      case 'value':
        return prop.defaultValue.value;

      case 'function':
        return `(${prop.defaultValue.expression})()`;
    }
  }

  if (prop.type.length === 1) {
    const type = prop.type[0];

    if (type.kind === 'string') {
      return '$p.string()';
    } else if (type.kind === 'number') {
      return '$p.number()';
    } else if (type.kind === 'boolean') {
      return '$p.bool()';
    } else if (type.kind === 'enum') {
      return `(${JSON.stringify(type.values)})[$p.number.int.in(0, ${type.values.length - 1})]`;
    }
  }

  return 'null';
}

function PreviewPlugin(): Plugin[] {
  const shellBasePath = getPreviewShellPath();
  const providerPath = getProviderPath();
  let store: ComponentMetadataStore;
  let compiler: PreviewCompilerStore;
  let setupFile: string | undefined;
  const descriptors = new DescriptorStore();

  return [
    {
      name: 'preview:pre',
      enforce: 'pre',

      configResolved(config) {
        store = new ComponentMetadataStore(config.root, descriptors);
        compiler = new PreviewCompilerStore(descriptors);
      },

      resolveId(source) {
        if (source.startsWith('/@preview:shell/')) {
          return Path.resolve(
            shellBasePath,
            source.replace('/@preview:shell/', '') || 'index.html'
          );
        }

        if (source.startsWith('/@preview:hmr')) {
          return Path.resolve(__dirname, '../browser/vite-hmr-client.js');
        }

        if (source === '@vuedx/preview-provider') {
          return providerPath;
        }
      },
    },
    {
      name: 'preview:post',
      enforce: 'post',
      async handleHotUpdate(file, mods, read, server) {
        if (file.endsWith('.vue')) {
          const affectedModules = new Set<ModuleNode | undefined>(
            mods.filter((mod) => !/\?vue&type=preview/.test(mod.id))
          );

          const content = await read();
          const prevDescriptor = descriptors.get(file);
          const prevPreviews = prevDescriptor.customBlocks
            .map((block, index) => ({ index, block }))
            .filter((a) => a.block.type === 'preview');

          const nextDescriptor = descriptors.set(file, content);
          const nextPreviews = nextDescriptor.customBlocks
            .map((block, index) => ({ index, block }))
            .filter((a) => a.block.type === 'preview');

          const id = `/@preview:instance/${Path.relative(server.config.root, file)}?index=`;
          nextPreviews.forEach((a, index) => {
            const b = prevPreviews[index];

            if (b == null) return;
            if (a.block.content !== b.block.content || a.index !== b.index) {
              const prev = server.moduleGraph.getModuleById(`${id}${b.index}`);
              const next = server.moduleGraph.getModuleById(`${id}${a.index}`);

              if (prev != null) affectedModules.add(prev);
              if (next != null) affectedModules.add(next);
            }
          });
          if (prevPreviews.length === 0) {
            const prev = server.moduleGraph.getModuleById(id);
            if (prev != null) affectedModules.add(prev);
          }

          const prevContent = store.getText();
          store.reload(file, content);
          const nextContent = store.getText();
          if (prevContent !== nextContent) {
            affectedModules.add(server.moduleGraph.getModuleById('/@preview:components'));
          }

          return Array.from(affectedModules);
        }
      },

      transform(_, id) {
        if (/\?vue&type=preview/.test(id)) {
          return {
            code: `export default null`,
          };
        }
      },

      async configureServer(server) {
        await glob('**/*.vue', {
          cwd: server.config.root,
          ignore: ['node_modules', '**/node_modules/**/*'],
          absolute: true,
        }).then((files) => {
          return Promise.all(
            files.map(async (fileName) => {
              store.add(fileName, await FS.promises.readFile(fileName, { encoding: 'utf-8' }));
            })
          );
        });

        const files = [
          Path.resolve(server.config.root, 'preview.ts'),
          Path.resolve(server.config.root, 'preview.js'),
        ];

        for (const file of files) {
          if (FS.existsSync(file)) setupFile = file;
        }

        server.watcher.on('all', async (event, fileName) => {
          const timestamp = Date.now();
          if (files.includes(fileName)) {
            setupFile = fileName;
            server.ws.send({
              type: 'update',
              updates: [
                {
                  type: 'js-update',
                  path: '/@preview:setup',
                  accpetedPath: `/@preview:setup`,
                  timestamp,
                },
              ],
            });
          } else if (fileName.startsWith(store.root) && fileName.endsWith('.vue')) {
            if (event === 'unlink') {
              store.remove(fileName);
            } else if (event === 'add') {
              store.add(fileName, await FS.promises.readFile(fileName, { encoding: 'utf-8' }));
            }
          }
        });

        server.app.use(async function ServePreviewShell(req, res, next) {
          if (req.method === 'GET') {
            const url = (req.url ?? '/').split('?').shift();
            if (
              url.startsWith('/@preview:shell/') ||
              ['/favicon.ico'].includes(url) ||
              !/[@.]/.test(url)
            ) {
              const fileName = Path.resolve(
                shellBasePath,
                req.url?.replace('/@preview:shell/', '').replace(/^\//, '') || 'index.html'
              );
              if (/\.(css|js|png|ico|xml|json|map|svg)$/.test(fileName)) {
                req.url = `/@fs/${fileName.replace(/\\/g, '/')}`;
              } else {
                const html = FS.readFileSync(
                  Path.resolve(shellBasePath, 'index.html'),
                  'utf-8'
                ).replace(
                  '</body>',
                  `<script type="module" src="/@preview:hmr"></script>` +
                    `<script type="module" src="/@preview:components"></script></body>`
                );
                return send(req, res, html, 'html');
              }
            }
          }

          return await next();
        });

        server.app.use(async function ServePreviewApp(req, res, next) {
          if (req.url?.startsWith('/@preview:iframe/')) {
            const result = getPreviewSelector(req.url);

            return send(
              req,
              res,
              `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Preview of ${result.fileName}</title>
  <script type="module" src="/@vite/client"></script>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/@preview:app/${result.fileName}?index=${result.index ?? ''}"></script>
</body>
          `.trimStart(),
              'html'
            );
          }

          return next();
        });
      },

      load(id) {
        if (!id.startsWith('/@preview:')) return;
        if (id.startsWith('/@preview:components')) return store.getText();
        if (id.startsWith('/@preview:instance/')) {
          const result = getPreviewSelector(id);
          if (result.index == null) {
            const { info } = store.get(result.fileName);
            const componentName = getComponentName(result.fileName);
            // TODO: extract as a function so it can be used in extension.
            return compiler.compileText(
              `
<${componentName}${info.props
                .map((prop) => (prop.required ? ` :${prop.name}="${getPropValue(prop)}"` : ''))
                .join('')}>
  <component :is="$p.stub.static('Slot: default')" />
</${componentName}>
          `.trim(),
              Path.resolve(store.root, result.fileName)
            );
          } else {
            return compiler.compile(Path.resolve(store.root, result.fileName), result.index);
          }
        }
        if (id.startsWith('/@preview:setup')) {
          return setupFile != null
            ? `
import * as setup from '/@fs/${setupFile}'
import { createApp as vueCreateApp } from 'vue'

export const createApp = setup.createApp ?? vueCreateApp
export const x = setup.x ?? {}
`.trimStart()
            : `
import { createApp } from 'vue'

export { createApp }
export const x = {}
`.trimStart();
        }
        if (id.startsWith('/@preview:app')) {
          const result = getPreviewSelector(id);

          return `
import { createApp, x } from '/@preview:setup'
import { installFetchInterceptor } from '@vuedx/preview-provider'
import App from '/@preview:instance/${result.fileName}?index=${result.index ?? ''}'

installFetchInterceptor()

const app = createApp(App)
app.provide('@preview:UserProviders', x)
app.mount('#app')
`.trimStart();
        }
      },
    },
  ];
}

export { PreviewPlugin };
function getPreviewShellPath() {
  const pkgPath = require.resolve('@vuedx/preview-shell/package.json');
  return Path.resolve(Path.dirname(pkgPath), 'dist');
}

function getProviderPath(): string {
  const pkgPath = require.resolve('@vuedx/preview-provider/package.json');
  const pkg = require(pkgPath);

  return Path.resolve(Path.dirname(pkgPath), pkg.module);
}
