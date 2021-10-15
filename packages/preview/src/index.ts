import glob from 'fast-glob';
import * as FS from 'fs';
import * as Path from 'path';
import sirv from 'sirv';
import { ModuleNode, Plugin, send } from 'vite';
import {
  genEntryHTML,
  genPreviewAppEntryScript,
  genPreviewIFrameContent,
  genVSCodeKeyboardEventSupport,
} from './generators';
import { ComponentMetadataStore } from './store/ComponentMetadataStore';
import { DescriptorStore } from './store/DescriptorStore';
import type { FileSystemHost } from './store/FileSystemHost';
import { PreviewCompilerStore } from './store/PreviewCompilerStore';
import { getComponentName, getPreviewShellPath, getPropValue, getProviderPath } from './utils';
import {
  ComponentResourceType,
  IFRAME_PREFIX,
  parsePreviewResource,
  parseURI,
  resourceToFile,
  resourceToID,
  ResourceType,
  SHELL_PREFIX,
} from './virtual-resource';

export interface PreviewPluginOptions {
  mode: 'standalone' | 'plugin';
}

const DEFAULTS: PreviewPluginOptions = {
  mode: 'plugin',
};

function PreviewPlugin(options?: PreviewPluginOptions): Plugin[] {
  const resolvedOptions = { ...DEFAULTS, ...options };
  const shellBasePath = getPreviewShellPath();
  const providerPath = getProviderPath();
  let store: ComponentMetadataStore;
  let compiler: PreviewCompilerStore;
  let setupFile: string | undefined;
  const fsHost: FileSystemHost = {
    exists: async (fileName) => FS.existsSync(fileName),
    readFile: async (fileName) => await FS.promises.readFile(fileName, 'utf-8'),
  };
  const descriptors = new DescriptorStore(fsHost);

  return [
    {
      /* Serve preview shell assets and iframe contents. */
      name: '@vuedx/preview:pre',
      enforce: 'pre',
      async configureServer(server) {
        const serve = sirv(shellBasePath, { dev: true, etag: true, extensions: [] });
        server.middlewares.use((req, res, next) => {
          if (req.method === 'GET' && req.url != null) {
            if (req.url.startsWith(SHELL_PREFIX)) {
              req.url = req.url.substr(SHELL_PREFIX.length + 1);

              return serve(req, res, next);
            }

            if (req.url.startsWith(IFRAME_PREFIX)) {
              const { fileName, query } = parseURI(req.url.substr(IFRAME_PREFIX.length + 1));
              const html = genPreviewIFrameContent(store.root, {
                fileName: Path.resolve(store.root, fileName),
                index:
                  typeof query['index'] === 'string' && query['index'].length > 0
                    ? parseInt(query['index'])
                    : undefined,
              });

              return send(req, res, html, 'html');
            }
          }

          return next();
        });
      },
    },
    {
      name: '@vuedx/preview',
      async handleHotUpdate({ file, modules: mods, server }) {
        if (file.endsWith('.vue') || file.endsWith('.vue.p')) {
          file = file.replace(/\.p$/, '');

          const prevPreviews = descriptors.getOrNull(file)?.previews ?? [];
          const nextPreviews = (await descriptors.reload(file)).previews;

          const added = new Set<number | undefined>();
          const removed = new Set<number | undefined>();
          const updated = new Set<number>();
          const unchanged = new Set<number>();

          // TODO: Fix indices because
          for (let i = 0; i < Math.max(prevPreviews.length, nextPreviews.length); ++i) {
            const prev = prevPreviews[i];
            const next = nextPreviews[i];

            if (prev != null && next != null) {
              if (prev.content !== next.content || !areAttrsEqual(prev.attrs, next.attrs)) {
                updated.add(i);
              } else unchanged.add(i);
            } else if (next !== null) {
              added.add(i);
            } else if (prev != null) {
              removed.add(i);
            }
          }

          const prevIndexContent = store.getText();
          await store.reload(file);
          const nextIndexContent = store.getText();

          const affectedModules = new Set(mods);
          if (prevIndexContent !== nextIndexContent) {
            const mod =
              (await server.moduleGraph.getModuleById(ResourceType.LIST_COMPONENTS)) ??
              (await server.moduleGraph.getModuleByUrl(`/${ResourceType.LIST_COMPONENTS}`));
            if (mod != null) affectedModules.add(mod);
          }

          const prevCount = prevPreviews.filter((block) => block != null).length;
          const nextCount = nextPreviews.filter((block) => block != null).length;

          if (nextCount > 0 && prevCount === 0) {
            removed.add(undefined);
          } else if (prevCount === 0 && nextCount > 0) {
            added.add(undefined);
          }

          const fileName = Path.relative(store.root, file);

          await Promise.all(
            Array.from(updated).map(async (index) => {
              const id = resourceToID({
                type: ComponentResourceType.COMPONENT,
                fileName,
                index,
              });
              const url = resourceToFile({
                type: ComponentResourceType.COMPONENT,
                fileName,
                index,
              });
              const mod =
                (await server.moduleGraph.getModuleById(id)) ??
                (await server.moduleGraph.getModuleByUrl(url));
              if (mod != null) affectedModules.add(mod);
              else console.warn(`Module not found: ${id}`);
            })
          );

          await Promise.all(
            Array.from(removed).map(async (index) => {
              const id = resourceToID({
                type: ComponentResourceType.COMPONENT,
                fileName,
                index,
              });
              const url = resourceToFile({
                type: ComponentResourceType.COMPONENT,
                fileName,
                index,
              });
              const mod =
                (await server.moduleGraph.getModuleById(id)) ??
                (await server.moduleGraph.getModuleByUrl(url));

              if (mod != null) server.moduleGraph.invalidateModule(mod);
            })
          );

          return Array.from(affectedModules).filter((m): m is ModuleNode => m != null);
        }

        return undefined;
      },

      configResolved(config) {
        store = new ComponentMetadataStore(config.root, descriptors, fsHost);
        compiler = new PreviewCompilerStore(descriptors);
      },

      async resolveId(id, importer) {
        if (id === '@vuedx/preview-provider') {
          return '@vuedx/preview-provider';
        }

        if (id === ResourceType.LIST_COMPONENTS) {
          return `/${ResourceType.LIST_COMPONENTS}`;
        }

        if (id === ResourceType.USER_SETUP) {
          return `/${ResourceType.USER_SETUP}`;
        }

        const resource = parsePreviewResource(id);
        if (resource != null) {
          return resourceToFile(resource);
        }

        if (importer != null) {
          const importerAsResource = parsePreviewResource(importer);
          if (importerAsResource != null) {
            const importer = Path.resolve(store.root, importerAsResource.fileName);

            return await this.resolve(id, importer);
          }
        }

        return undefined;
      },

      async load(id) {
        switch (id) {
          case '@vuedx/preview-provider':
            return await FS.promises.readFile(providerPath, 'utf-8');
          case `/${ResourceType.USER_SETUP}`: {
            return setupFile != null
              ? [
                  `import * as preview from '${setupFile}'`,
                  `import * as vue from 'vue'`,
                  ``,
                  `export const createApp = preview.createApp ?? vue.createApp`,
                  `export const x = preview.x ?? {}`,
                ].join('\n')
              : [
                  `import * as vue from 'vue'`,
                  ``,
                  `export const createApp = vue.createApp`,
                  `export const x = {}`,
                ].join('\n');
          }

          case `/${ResourceType.LIST_COMPONENTS}`: {
            return store.getText();
          }
        }

        const resource = parsePreviewResource(id);
        if (resource == null) return;
        switch (resource.type) {
          case ComponentResourceType.META: {
            return `export default ${JSON.stringify(store.get(resource.fileName), null, 2)}`;
          }

          case ComponentResourceType.COMPONENT: {
            if (resource.index == null) {
              const metadata = await store.get(resource.fileName);
              const componentName = getComponentName(resource.fileName);
              const props =
                metadata?.info?.props
                  .map((prop) => (prop.required ? ` :${prop.name}="${getPropValue(prop)}"` : ''))
                  .join('') ?? '';

              // TODO: extract as a function so it can be used in extension.
              return compiler.compileText(
                [
                  `<${componentName}${props}>`,
                  ` <component :is="this.$p.stub.static('Slot: default')" />`,
                  `</${componentName}>`,
                ].join('\n'),
                Path.resolve(store.root, resource.fileName)
              );
            } else {
              return compiler.compile(Path.resolve(store.root, resource.fileName), resource.index);
            }
          }

          case ComponentResourceType.ENTRY: {
            return genPreviewAppEntryScript(
              store.root,
              resource,
              await descriptors.get(Path.resolve(store.root, resource.fileName))
            );
          }
        }
      },

      transformIndexHtml: {
        enforce: 'pre',
        transform(_, ctx) {
          if (resolvedOptions.mode === 'plugin' && !ctx.path.startsWith('/__preview')) return [];

          return [
            {
              tag: 'script',
              attrs: {
                type: 'module',
                src: '/@vite/client',
              },
              injectTo: 'body',
            },

            {
              tag: 'script',
              attrs: {
                type: 'module',
              },
              children: `import '/${ResourceType.LIST_COMPONENTS}'`,
              injectTo: 'body',
            },

            {
              tag: 'script',
              children: genVSCodeKeyboardEventSupport(),
              injectTo: 'body',
            },
          ];
        },
      },

      transform(_, id) {
        if (id.includes('?vue&type=preview')) {
          return {
            code: `export default null; `,
          };
        }

        return undefined;
      },
      async configureServer(server) {
        const indexHtmlContent = genEntryHTML(shellBasePath);
        const rootDir = server.config.root;
        const { file, files } = getUserSetupFile(rootDir);
        const setupFiles = new Set(files);

        setupFile = file;

        server.watcher.on('all', (event, fileName) => {
          if (setupFiles.has(fileName)) {
            setupFile = fileName;
            server.ws.send({
              type: 'full-reload',
            });
          } else if (store.isSupported(fileName)) {
            if (event === 'unlink') {
              store.remove(fileName);
            } else if (event === 'add') {
              void store.add(fileName);
            }
          }
        });

        server.middlewares.use(function ServePreviewShell(req, res, next) {
          if (req.method === 'GET' && req.url != null) {
            const path = req.url.replace(/\?.*$/, '');
            if (resolvedOptions.mode === 'plugin') {
              if (path === '/__preview' || path.startsWith('/__preview/')) {
                return send(req, res, indexHtmlContent, 'html');
              }
            } else {
              if (/^\/(|sandbox)\/?(\?.*)?$/.test(path)) {
                return send(req, res, indexHtmlContent, 'html');
              }
            }
          }

          return next();
        });

        const http = server.httpServer;
        if (http != null && resolvedOptions.mode === 'plugin') {
          http.on('listening', () => {
            void Promise.resolve().then(() => {
              const scheme =
                server.config.server.https == null || server.config.server.https === false
                  ? 'http'
                  : 'https';
              const address = http.address();
              const port = typeof address !== 'string' && address != null ? address.port : 3000;
              const portString =
                scheme === 'http' && port === 80
                  ? ''
                  : scheme === 'https' && port === 443
                  ? ''
                  : `:${port}`;
              const host =
                typeof server.config.server.host === 'string'
                  ? server.config.server.host
                  : 'localhost';

              console.log(`  Preview is enabled.`);
              console.log(`  > Local: ${scheme}://${host}${portString}/__preview\n`);
            });
          });
        }

        await loadVueFiles(rootDir, store);
      },
    },
  ];
}

export { PreviewPlugin };

function getUserSetupFile(rootDir: string): { files: string[]; file?: string } {
  const files = [Path.resolve(rootDir, 'preview.ts'), Path.resolve(rootDir, 'preview.js')];

  for (const file of files) {
    if (FS.existsSync(file)) return { files, file };
  }

  return { files };
}

async function loadVueFiles(root: string, store: ComponentMetadataStore): Promise<void> {
  await glob('**/*.vue', {
    cwd: root,
    ignore: ['node_modules', '**/node_modules/**/*'],
    absolute: true,
  }).then(async (files: string[]): Promise<void> => {
    await Promise.all(
      files.map(async (fileName) => {
        await store.add(fileName);
      })
    );
  });
}

function areAttrsEqual(
  x: Record<string, string | true>,
  y: Record<string, string | true>
): boolean {
  if (x === y) return true;

  for (const p in x) {
    if (x[p] === y[p]) continue;
    if (typeof x[p] !== 'object') return false;
  }

  for (const p in y) {
    if (p in y && !(p in x)) return false;
  }

  return true;
}
