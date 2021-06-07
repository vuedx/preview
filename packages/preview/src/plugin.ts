import { SFCBlock } from '@vuedx/compiler-sfc';
import glob from 'fast-glob';
import FS from 'fs';
import Path from 'path';
import { ModuleNode, Plugin, send } from 'vite';
import {
  genEntryHTML,
  genPreviewAppEntryScript,
  genPreviewIFrameContent,
  genVSCodeKeyboardEventSupport,
} from './generators';
import sirv from 'sirv';
import { ComponentMetadataStore } from './store/ComponentMetadataStore';
import { DescriptorStore } from './store/DescriptorStore';
import { PreviewCompilerStore } from './store/PreviewCompilerStore';
import { getComponentName, getPreviewShellPath, getPropValue, getProviderPath } from './utils';
import {
  ComponentScopedResourceType,
  InternalResoruceType,
  isVirtualResource,
  parseVirtualResourceURI,
  PrefixedResourceType,
  resourceToID,
  resourceToURI,
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

      configResolved(config) {
        store = new ComponentMetadataStore(config.root, descriptors);
        compiler = new PreviewCompilerStore(descriptors);
      },

      resolveId(id) {
        if (id === '@vuedx/preview-provider') {
          return providerPath;
        }

        if (!isVirtualResource(id)) return;
        const resource = parseVirtualResourceURI(id);

        if (resource.type === PrefixedResourceType.SHELL) {
          return Path.resolve(shellBasePath, resource.fileName);
        }

        return resourceToID(resource);
      },

      load(id) {
        if (!isVirtualResource(id)) return;
        const resource = parseVirtualResourceURI(id);

        switch (resource.type) {
          case ComponentScopedResourceType.COMPONENT_META: {
            return `export default ${JSON.stringify(store.get(resource.fileName), null, 2)}`;
          }

          case ComponentScopedResourceType.COMPONENT_INSTANCE: {
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

          case ComponentScopedResourceType.COMPONENT_APP: {
            return genPreviewAppEntryScript(resource);
          }

          case ComponentScopedResourceType.COMPONENT_HTML_PAGE: {
            return genPreviewIFrameContent(resource);
          }

          case InternalResoruceType.USER_SETUP: {
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

          case InternalResoruceType.LIST_COMPONENTS: {
            return store.getText();
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
                src: resourceToURI({ type: InternalResoruceType.LIST_COMPONENTS }),
              },
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

      async configureServer(server) {
        const serve = sirv(shellBasePath, { dev: true, etag: true, extensions: [] });
        server.middlewares.use(async (req, res, next) => {
          if (req.method === 'GET' && req.url != null) {
            if (isVirtualResource(req.url)) {
              const resource = parseVirtualResourceURI(req.url);
              if (resource.type === ComponentScopedResourceType.COMPONENT_HTML_PAGE) {
                const html = genPreviewIFrameContent(resource);

                return send(req, res, html, 'html');
              }

              if (resource.type === PrefixedResourceType.SHELL) {
                req.url = resource.fileName;

                return serve(req, res, next);
              }
            }
          }

          return next();
        });
      },
    },
    {
      name: 'preview:post',
      enforce: 'post',
      async handleHotUpdate({ file, modules: mods, read, server }) {
        if (file.endsWith('.vue')) {
          const affectedModules = new Set<ModuleNode>(mods);

          const content = await read();
          const prevDescriptor = descriptors.get(file);
          interface PreviewBlockWithIndex {
            block: SFCBlock;
            index: number;
          }

          const prevPreviews: Array<PreviewBlockWithIndex> = prevDescriptor.customBlocks
            .map((block: SFCBlock, index: number): PreviewBlockWithIndex => ({ index, block }))
            .filter(({ block }: PreviewBlockWithIndex) => block.type === 'preview');

          const nextDescriptor = descriptors.set(file, content);
          const nextPreviews: Array<{
            block: SFCBlock;
            index: number;
          }> = nextDescriptor.customBlocks
            .map((block: SFCBlock, index: number): PreviewBlockWithIndex => ({ index, block }))
            .filter(({ block }: PreviewBlockWithIndex) => block.type === 'preview');

          const id = resourceToURI({
            type: ComponentScopedResourceType.COMPONENT_INSTANCE,
            fileName: Path.relative(server.config.root, file),
          });
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
            const indexModule = server.moduleGraph.getModuleById(
              resourceToID({ type: InternalResoruceType.LIST_COMPONENTS })
            );
            if (indexModule != null) affectedModules.add(indexModule);
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
        const indexHtmlContent = genEntryHTML(shellBasePath);
        const rootDir = server.config.root;
        const { file, files } = getUserSetupFile(rootDir);
        const setupFiles = new Set(files);

        setupFile = file;

        server.watcher.on('all', async (event, fileName) => {
          const timestamp = Date.now();
          if (setupFiles.has(fileName)) {
            setupFile = fileName;
            server.ws.send({
              type: 'update',
              updates: [
                {
                  type: 'js-update',
                  path: resourceToURI({ type: InternalResoruceType.USER_SETUP }),
                  acceptedPath: resourceToURI({ type: InternalResoruceType.USER_SETUP }),
                  timestamp,
                },
              ],
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
            if (/^\/(|sandbox)\/?(\?.*)?$/.test(req.url)) {
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
