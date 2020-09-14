import createDebugLogger from 'debug';
import * as FS from 'fs';
import * as Path from 'path';
import * as QuickLRU from 'quick-lru';
import picomatch from 'picomatch';
import { ServerPlugin } from 'vite';
import { CustomBlockTransform } from 'vite/dist/node/transform';
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

  return {
    configureServer: createServerPlugin(config),
    blockProcessor: createPreviewBlockProcessor(),
  };
}

function createServerPlugin({
  rootDir,
  include,
  exclude,
  templates,
  deviceAlias,
}: PreviewConfig): ServerPlugin {
  const isValid = createMatcher(include, exclude);

  return function PreviewServerPlugin({ app, watcher, config }) {
    const icon = Buffer.from(
      'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAABILAAASCwAAAAAAAAAAAAD//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////Pj//evV//vctf/73LX//evV///8+P/////////////////////////////////////////////////97tr/97xx//SjPv/2sFn/9rBY//SiO//3u2///e3a///////////////////////////////////////97tz/9a1S//ObLP/60J3/++G///vhv//5z5r/85kn//WrTf/97tv//////////////////////////////vz/+MB7//OXJP/2sVr/++G///SiOv/0oTn/++C+//avVv/zlB3/+L52///+/P////////////////////////78//jBfP/zmCX/9rFa//vhv//0ojr/9KI6//vgvv/2r1b/85Qe//i+d////vz////////////////////////////9793/9a5V//OcMP/50J3/++HA//vhwP/50Jv/85oq//WsT//97tv///////////////////////////////////////3u2//3vXX/9KZD//ayXf/2slz/9KQ///e8cf/97tr///////////////////////////////////////////////////z4//3s1v/73bf/+922//3r1v///Pj/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
      'base64'
    );
    const userSetupFileTS = Path.resolve(rootDir, 'preview.ts');
    const userSetupFileJS = Path.resolve(rootDir, 'preview.js');

    store.devices = {
      ...store.devices,
      ...deviceAlias,
    };
    watcher.on('add', async (fileName) => {
      if (userSetupFileTS === fileName || userSetupFileJS === fileName) {
        await FS.promises.writeFile(
          templates.autoSetup,
          `export * from "${fileName.replace(/\.(ts|js)$/, '')}"`
        );
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
          const component = store.get(fileName);

          watcher.send({
            type: 'custom',
            id: '@preview',
            customData: { type: 'pick', id: component.id },
          });
        }

        const newContent = store.getText();
        if (oldContent !== newContent) {
          await FS.promises.writeFile(templates.componentIndex, newContent);
          debug('Updated component index.');
          watcher.emit('change', templates.componentIndex);
        }
      }
    });

    app.use(async (ctx, next) => {
      if (/^\/?(\?.*)?$/.test(ctx.path)) {
        ctx.body = templates.dashboardPage;
        ctx.type = 'text/html';
      }

      if (ctx.path.startsWith('/preview.html')) {
        ctx.body = templates.previewPage;
        ctx.type = 'text/html';
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

function createPreviewBlockProcessor(): CustomBlockTransform {
  const cache = new QuickLRU<string, string>({ maxSize: 1000 });

  return ({ code, path, query, id }) => {
    const cacheKey = id + code;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const name = String(query.name || `Preview ${query.index}`);
    const device = store.devices[query.device as string] || 'iPhone X';

    const { compileTemplate } = resolveCompiler();
    const component = store.get(path);

    const result = compileTemplate({
      source: code,
      filename: path,
    });

    const output = [
      result.code,
      `export default function(component) {
        const previews = component.__previews__ || (component.__previews__ = []);
        previews.push({ 
          name: ${s(name)}, 
          device: ${s(device)},
          component: { 
            render, 
            components: { 
              [${s(component.name)}]: component
            }
          }
        })
      }

      if (import.meta.hot) {
        import.meta.hot.accept((m) => {
          console.log('HOT, here', m)
        })
      }
      `,
    ].join('\n');

    cache.set(cacheKey, output);

    return output;
  };
}
