import createDebugLogger from 'debug';
import * as FS from 'fs';
import * as Path from 'path';
import picomatch from 'picomatch';
import * as QuickLRU from 'quick-lru';
import { ServerPlugin } from 'vite';
import type { CustomBlockTransform, IndexHtmlTransformFn } from 'vite/dist/node/transform';
import { parse } from 'vue-docgen-api';
import { ComponentMetadataStore, resolveCompiler, s } from './store';

const debug = createDebugLogger('preview:plugin');

function read(fileName: string) {
  return FS.readFileSync(Path.resolve(__dirname, fileName), { encoding: 'utf-8' });
}

interface PreviewOptions {
  rootDir: string;
  include: string[];
  exclude: string[];
  deviceAlias?: Record<string, string>;
}

interface PreviewConfig extends PreviewOptions {
  templates: {
    previewPage: string;
    dashboardPage: string;
    autoSetup: string;
    componentIndex: string;
  };
}

let store: ComponentMetadataStore;

const MARK_REMOVE_VITE = '<!--@preview:remove-vite-client-->';
export function createPreviewPlugin(options: PreviewOptions) {
  store = store || new ComponentMetadataStore(options.rootDir);

  const config: PreviewConfig = {
    ...options,
    templates: {
      autoSetup: Path.resolve(options.rootDir, 'node_modules/.preview/auto-setup.js'),
      componentIndex: Path.resolve(options.rootDir, 'node_modules/.preview/component-index.js'),
      dashboardPage: read('../browser/index.html'),
      previewPage: read('../browser/preview.html'),
    },
  };

  const transform: IndexHtmlTransformFn = (ctx) => {
    if (ctx.code.includes(MARK_REMOVE_VITE)) {
      ctx.code = ctx.code
        .replace(MARK_REMOVE_VITE, '')
        .replace('<script type="module">import "/vite/client"</script>', '');
    }

    return ctx.code;
  };

  return {
    indexHtmlTransforms: [
      {
        apply: 'post' as const,
        transform,
      },
    ],
    configureServer: createServerPlugin(config),
    blockProcessor: createPreviewBlockProcessor(config.rootDir),
  };
}

function createServerPlugin({ rootDir, include, exclude, templates }: PreviewConfig): ServerPlugin {
  const isValid = createMatcher(include, exclude);

  return function PreviewServerPlugin({ app, watcher, resolver }) {
    const icon = Buffer.from(
      'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Pj//evV//vctf/73LX//evV///8+P/////////////////////////////////////////////////97tr/97xx//SjPv/2sFn/9rBY//SiO//3u2///e3a///////////////////////////////////////97tz/9a1S//ObLP/60J3/++G///vhv//5z5r/85kn//WrTf/97tv//////////////////////////////vz/+MB7//OXJP/2sVr/++G///SiOv/0oTn/++C+//avVv/zlB3/+L52///+/P////////////////////////78//jBfP/zmCX/9rFa//vhv//0ojr/9KI6//vgvv/2r1b/85Qe//i+d////vz////////////////////////////9793/9a5V//OcMP/50J3/++HA//vhwP/50Jv/85oq//WsT//97tv///////////////////////////////////////3u2//3vXX/9KZD//ayXf/2slz/9KQ///e8cf/97tr///////////////////////////////////////////////////z4//3s1v/73bf/+922//3r1v///Pj/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
      'base64'
    );
    const userSetupFileTS = Path.resolve(rootDir, 'preview.ts');
    const userSetupFileJS = Path.resolve(rootDir, 'preview.js');

    const fileToRequest = resolver.fileToRequest;
    resolver.fileToRequest = (fileName) => {
      if (fileName === templates.componentIndex) {
        return '/@preview/components';
      } else if (fileName === templates.autoSetup) {
        return '/@preview/setup';
      }

      return fileToRequest(fileName);
    };

    watcher.on('add', async (fileName) => {
      if (userSetupFileTS === fileName || userSetupFileJS === fileName) {
        await FS.promises.writeFile(templates.autoSetup, `export * from "/preview"`);
        watcher.emit('change', templates.autoSetup);
      }
    });

    watcher.on('all', async (event, fileName) => {
      if (fileName.startsWith(rootDir) && isValid(fileName)) {
        const oldContent = store.getText();

        if (event === 'unlink') {
          store.remove(fileName);
        } else if (event === 'add' || event === 'change') {
          store.add(fileName, await FS.promises.readFile(fileName, { encoding: 'utf-8' }));
        }

        const newContent = store.getText();
        if (oldContent !== newContent) {
          await FS.promises.writeFile(templates.componentIndex, newContent);
          debug('Updated component index.');
          watcher.handleJSReload(templates.componentIndex, Date.now());
        }

        if (event === 'change') {
          const info = store.get(fileName);
          const timestamp = Date.now();
          info.previews.forEach((preview) => {
            watcher.send({
              type: 'custom',
              id: 'preview-reload',
              customData: {
                path: preview.id,
                timestamp,
              },
            });
          });
        }
      }
    });

    app.use(async (ctx, next) => {
      if (ctx.path === '/@preview/component-story.html') {
        const { fileName, story } = ctx.query;
        if (fileName == null) {
          ctx.response.status = 400;
          ctx.response.body = JSON.stringify({
            message: 'Missing required query parameter "fileName".',
          });
          ctx.response.type = 'application/json';
        }

        ctx.response.type = 'text/html';
        ctx.response.body = `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${fileName}</title>
          </head>
          <body>
            <div id="app"></div>
            <script type="module">
              import { defineAsyncComponent } from 'vue'
              import Component from '/${fileName}'
              import { createApp } from '/@preview/setup'

              const Preview = Component.__previews__?.find(
                (preview, index) => 
                  preview.name === ${JSON.stringify(story)} ||
                  index === Number(${JSON.stringify(story)})
              ) ?? {
                component: defineAsyncComponent(() =>
                  import('/@preview/inferred-story.js?component=${encodeURIComponent(fileName)}')
                )
              }

              const app = createApp(Preview.component)

              app.mount('#app')
            </script>
          </body>
        </html>
        `;
      }

      return next();
    });

    app.use(async (ctx, next) => {
      if (ctx.path === '/@preview/inferred-story.js') {
        const { component } = ctx.query;
        const metadata = store.get(component);

        if (metadata != null) {
          const props: Record<string, string> = {};
          const events: Record<string, string> = {};

          metadata.info.emits.forEach((emit) => {
            if (emit.name.startsWith('onUpdate:')) {
              const prop = emit.name.substr('onUpdate:'.length);
              events[emit.name] = `faker.writable[${s(prop)}] = $event`;
            } else {
              events[emit.name] = `faker.handle(${s(emit.name)})`;
            }
          });
          metadata.info.props.forEach((prop) => {
            const event = `onUpdate:${prop.name}`;
            if (event in events || prop.name === 'modelValue') {
              props[prop.name] = `faker.writable[${s(prop.name)}]`;
              if (prop.name === 'modelValue' && !('onUpdate:modelValue' in events)) {
                events[event] = `faker.writable[${s(prop.name)}] = $event`;
              }
            } else {
              props[prop.name] = `faker.random('string', ${s(prop.name)})`;
            }
          });
          ctx.response.type = 'application/javascript';
          ctx.response.body = `
          import { h, defineComponent, reactive } from 'vue'
          import Component from '/${metadata.path}'

          export default defineComponent({
            setup() {
              const handlers = {}
              const writable = reactive({})
              const handle = (name) => handlers[name] ?? (handlers[name] = (event) => console.log(name, event))
              const random = (type, name) => type
              const slot = (name) => () => h('span', { style: 'background: #F7E9D4; color: #B27603; padding: 4px 8px; border: 1px dashed #B27603; box-sizing: border-box; display: inline-block;' }, [name + ' slot'])
              const faker = { writable, handle, random, slot }

              return () => h(Component, {${Object.entries({ ...props, ...events })
                .map(([key, value]) => `${s(key)}: ${value},`)
                .join('\n')}}, {
                  default: faker.slot('default'),
                })
            },
          })
          `;
        }
      }

      return next();
    });

    const staticBasePath = Path.dirname(require.resolve('@vuedx/preview-shell/package.json'));
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/@preview-static')) {
        await ctx.read(staticBasePath + ctx.path.substr('/@preview-static'.length));
      } else if (ctx.path === '/@preview/setup') {
        await ctx.read(templates.autoSetup);
      } else if (ctx.path === '/@preview/components') {
        ctx.response.type = 'application/javascript';
        ctx.response.body = store.getText();
      } else if (ctx.path === '/@preview/vite-hmr-client') {
        await ctx.read(Path.resolve(__dirname, '../client/vite-hmr-client.js'));
      }

      return next();
    });

    app.use(async (ctx, next) => {
      if (!ctx.path.startsWith('/@') && !ctx.path.includes('.')) {
        await ctx.read(staticBasePath + '/dist/index.html');

        ctx.body = ctx.body.toString().replace(
          '</body>',
          `${MARK_REMOVE_VITE}<script type="module">
            import {components} from '/@preview/components'
            import { createHotContext } from '/@preview/vite-hmr-client'

            function setComponents(components) {
              window.components = components
              window.dispatchEvent(new CustomEvent('@preview:components', { detail: components }))
            }

            setComponents(components)

            const hot = createHotContext("${ctx.path}")
            hot.acceptDeps('/@preview/components', result => setComponents(result.components))
           </script>`
        );
      }
      return next();
    });

    app.use(async (ctx, next) => {
      // load docgen documentation if asked
      // for it using .__docgen__ suffix
      // we use a suffix here to avoid conflicting with standard .vue transform
      if (/.__docgen__$/.test(ctx.path)) {
        const componentPath = ctx.path.replace(/.__docgen__/, '').replace(/^\//, '');
        const docs = await parse(Path.resolve(rootDir, componentPath));
        ctx.body = `export default ${JSON.stringify(docs)}`;
        ctx.type = 'js';
      }

      if (ctx.path.startsWith('/favicon.ico')) {
        ctx.body = icon;
        ctx.type = 'image/ico';
      }

      return next();
    });
  };
}

function createMatcher(include: string[], exclude: string[]) {
  const isIncluded = picomatch(include);
  const isExcluded = picomatch(exclude);

  return (path: string) => !isExcluded(path) && isIncluded(path);
}

function createPreviewBlockProcessor(rootDir: string): CustomBlockTransform {
  const cache = new QuickLRU<string, string>({ maxSize: 1000 });

  return ({ code, path, query, id }) => {
    debug(`Preview changed in ${path} = ${id}`);
    const cacheKey = id + code;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const name = String(query.name || `Preview ${query.index}`);

    const { compileTemplate } = resolveCompiler();
    const component = store.get(path);

    const result = compileTemplate({
      source: code,
    });
    const request = `/${Path.relative(rootDir, id)}`;
    const output = [
      result.code,
      `export const preview = { 
        name: ${s(name)}, 
        component: { 
          render, 
          components: {},
          __hmrId: '${request}'
        }
      }`,
      `export default function(component) {
        const previews = component.__previews__ || (component.__previews__ = []);
        preview.component.of = component
        preview.component.components[${s(component.name)}] = component
        previews.push(preview)
      }

      if (import.meta.hot) {
        __VUE_HMR_RUNTIME__.createRecord('${request}', preview.component)
        import.meta.hot.on('preview-reload', ({ path, timestamp }) => {
          if (path === '${request}') {
            import(/*@vite-ignore*/path+'&t='+timestamp)
              .catch(console.error)
              .then(m => {
                __VUE_HMR_RUNTIME__.rerender(path, m.render)
              })
          }
        })
      }
      `,
    ].join('\n');

    cache.set(cacheKey, output);

    return output;
  };
}
