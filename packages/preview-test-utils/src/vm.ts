import type { SetupOptions } from '@vuedx/preview-provider';
import { Module } from 'module';
import * as Path from 'path';
import * as vm from 'vm';
import type { App, ComponentPublicInstance } from 'vue';
import { generatePreviewComponent, getPreviewId } from './transform';

type PreviewFactory<T = ComponentPublicInstance> = (overrides: Partial<SetupOptions>) => T;
type PreviewFactoryModule<T = ComponentPublicInstance> = (
  exports: any,
  require: NodeJS.Require,
  module: NodeModule,
  fileName: string,
  dirName: string
) => PreviewFactory<T>;

const compilations: Record<string, any> = {};
function compile(fileName: string, previewName: string): PreviewFactoryModule {
  const id = getPreviewId(fileName, previewName, false);
  if (compilations[id] != null) return compilations[id];

  const code = generatePreviewComponent(fileName, previewName, false);

  compilations[id] = vm.runInThisContext(Module.wrap(code), {
    filename: id,
    displayErrors: true,
    microtaskMode: 'afterEvaluate',
  });

  return compilations[id];
}

function compileAsApp(fileName: string, previewName: string): PreviewFactoryModule<App> {
  const id = `${fileName}?app&preview=${encodeURIComponent(previewName).replace(/%20/g, '+')}`;
  if (compilations[id] != null) return compilations[id];

  const code = generatePreviewComponent(fileName, previewName, true);
  compilations[id] = vm.runInThisContext(Module.wrap(code), {
    filename: id,
    displayErrors: true,
    microtaskMode: 'afterEvaluate',
  });

  return compilations[id];
}

const executions: Record<string, PreviewFactory<any>> = {};
interface RunOptions {
  fileName: string;
  previewName: string;
  isAppMode: boolean;
}

function run<T>({ fileName, previewName, isAppMode }: RunOptions): PreviewFactory<T> {
  // FIXME: Invalidate for watch mode.
  const id = getPreviewId(fileName, previewName, isAppMode);
  if (executions[id] != null) return executions[id] as PreviewFactory<T>;

  const fn: PreviewFactoryModule<any> = isAppMode
    ? compileAsApp(fileName, previewName)
    : compile(fileName, previewName);

  const req = Module.createRequire(fileName);

  // function req(id: string): any {
  //   if (id === '@vuedx/preview-provider') {
  //     try {
  //       return require(id);
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   }

  //   return r(id);
  // }

  // req.resolve = r.resolve;
  // req.cache = r.cache;
  // req.main = r.main;
  // req.extensions = r.extensions;
  const m: typeof module = {
    id: id,
    exports: {},
    children: [],
    require: req,
    filename: id,
    parent: module,
    path: Path.dirname(fileName),
    paths: req.resolve.paths(Path.dirname(fileName)) ?? [],
    loaded: false,
  };

  fn.call(m, m.exports, req, m, fileName, Path.dirname(fileName));

  m.loaded = true;

  return (executions[id] = m.exports.default);
}

export function execute(fileName: string, previewName: string): PreviewFactory {
  return run({ fileName, previewName, isAppMode: false });
}

export function executeAsApp(fileName: string, previewName: string): PreviewFactory<App> {
  return run({ fileName, previewName, isAppMode: true });
}
