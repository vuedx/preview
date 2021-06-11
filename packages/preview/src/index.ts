import type { SFCBlock, SFCDescriptor } from '@vuedx/compiler-sfc';
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

      async configureServer(server) {
        const serve = sirv(shellBasePath, { dev: true, etag: true, extensions: [] });
        server.middlewares.use(async (req, res, next) => {
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
      name: 'preview',
      async handleHotUpdate({ file, modules: mods, read, server }) {
        if (file.endsWith('.vue')) {
          const affectedModules = new Set<ModuleNode | null | undefined>(
            mods.filter((mod) => {
              if (mod.id != null) return !/\?vue&type=preview/.test(mod.id);
              return true;
            })
          );

          const content = await read();

          const prevDescriptor = descriptors.get(file);
          const prevPreviews = getPreviewsBlocks(prevDescriptor);
          const nextDescriptor = descriptors.set(file, content);
          const nextPreviews = getPreviewsBlocks(nextDescriptor);

          const base = resourceToID({
            type: ComponentResourceType.COMPONENT,
            fileName: Path.relative(server.config.root, file),
          });

          if (nextPreviews.length > 0) {
            const m = await server.moduleGraph.getModuleByUrl(base);
            if (m != null) server.moduleGraph.invalidateModule(m);
          }

          const added = new Set<number | undefined>();
          const removed = new Set<number | undefined>();
          const updated = new Set<number>();
          const unchanged = new Set<number>();

          for (let i = 0; i < Math.max(prevPreviews.length, nextPreviews.length); ++i) {
            const prev = prevPreviews[i];
            const next = nextPreviews[i];

            if (prev != null && next != null) {
              if (prev.content !== next.content) updated.add(i);
              else unchanged.add(i);
            } else if (next !== null) {
              added.add(i);
            } else if (prev != null) {
              removed.add(i);
            }
          }

          const prevIndexContent = store.getText();
          store.reload(file, content);
          const nextIndexContent = store.getText();
          const ids = new Set<string>();
          if (prevIndexContent !== nextIndexContent) {
            ids.add(ResourceType.LIST_COMPONENTS);
          }

          const prevCount = prevPreviews.filter((block) => block != null).length;
          const nextCount = nextPreviews.filter((block) => block != null).length;

          if (nextCount > 0 && prevCount == 0) {
            removed.add(undefined);
          } else if (prevCount == 0 && nextCount > 0) {
            added.add(undefined);
          }

          const fileName = Path.relative(store.root, file);

          updated.forEach((index) => {
            ids.add(
              resourceToID({
                type: ComponentResourceType.COMPONENT,
                fileName,
                index,
              })
            );
          });

          removed.forEach((index) => {
            ids.add(
              resourceToID({
                type: ComponentResourceType.COMPONENT,
                fileName,
                index,
              })
            );
          });

          const modules = await Promise.all(
            Array.from(ids).map(
              async (id) =>
                server.moduleGraph.getModuleById(id) ?? server.moduleGraph.getModuleByUrl(`/${id}`)
            )
          );

          modules.forEach((m) => {
            if (m != null) {
              affectedModules.add(m);
            }
          });

          return Array.from(affectedModules).filter((m): m is ModuleNode => m != null);
        }

        return
      },

      configResolved(config) {
        store = new ComponentMetadataStore(config.root, descriptors);
        compiler = new PreviewCompilerStore(descriptors);
      },

      resolveId(id) {
        if (id === '@vuedx/preview-provider') {
          return providerPath;
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

        return
      },

      load(id) {
        switch (id) {
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
              const { info } = store.get(resource.fileName);
              const componentName = getComponentName(resource.fileName);
              const props = info.props
                .map((prop) => (prop.required ? ` :${prop.name}="${getPropValue(prop)}"` : ''))
                .join('');

              // TODO: extract as a function so it can be used in extension.
              return compiler.compileText(
                [
                  `<${componentName}${props}>`,
                  ` <component :is="$p.stub.static('Slot: default')" />`,
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
              descriptors.get(Path.resolve(store.root, resource.fileName))
            );
          }
        }
      },

      transformIndexHtml: {
        enforce: 'pre',
        transform() {
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
        if (/\?vue&type=preview/.test(id)) {
          return {
            code: `export default null; `,
          };
        }

        return
      },

      async configureServer(server) {
        const indexHtmlContent = genEntryHTML(shellBasePath);
        const rootDir = server.config.root;
        const { file, files } = getUserSetupFile(rootDir);
        const setupFiles = new Set(files);

        setupFile = file;

        server.watcher.on('all', async (event, fileName) => {
          if (setupFiles.has(fileName)) {
            setupFile = fileName;
            // TODO: Invalidate setup file
            server.ws.send({
              type: 'full-reload',
            });
          } else if (store.isSupported(fileName)) {
            if (event === 'unlink') {
              store.remove(fileName);
            } else if (event === 'add') {
              store.add(fileName, await FS.promises.readFile(fileName, { encoding: 'utf-8' }));
            }
          }
        });

        server.middlewares.use(async function ServePreviewShell(req, res, next) {
          if (req.method === 'GET' && req.url != null) {
            // Serve all shell pages.
            const path = req.url.replace(/\?.*$/, '');
            if (/^\/(|sandbox)\/?(\?.*)?$/.test(path)) {
              return send(req, res, indexHtmlContent, 'html');
            }
          }

          return await next();
        });

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
  }).then((files) => {
    return Promise.all(
      files.map(async (fileName) => {
        store.add(fileName, await FS.promises.readFile(fileName, { encoding: 'utf-8' }));
      })
    );
  });
}

function getPreviewsBlocks(descriptor: SFCDescriptor): Array<SFCBlock | null> {
  return descriptor.customBlocks.map((block: SFCBlock) =>
    block.type === 'preview' ? block : null
  );
}
