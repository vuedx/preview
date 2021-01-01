import { App, ComponentPublicInstance } from '@vue/runtime-core';
import { SetupOptions } from '@vuedx/preview-provider';
import { Module } from 'module';
import Path from 'path';
import vm from 'vm';
import { generatePreviewComponent } from './transform';

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
  const id = `${fileName}:${previewName}`;
  return (
    compilations[id] ??
    (compilations[id] = vm.runInThisContext(
      Module.wrap(generatePreviewComponent(fileName, previewName))
    ))
  );
}

function compileAsApp(fileName: string, previewName: string): PreviewFactoryModule<App> {
  const id = `app:${fileName}:${previewName}`;
  return (
    compilations[id] ??
    (compilations[id] = vm.runInThisContext(
      Module.wrap(generatePreviewComponent(fileName, previewName, true))
    ))
  );
}

const executions: Record<string, PreviewFactory<any>> = {};
function doExecute<T>(id: string, fn: PreviewFactoryModule<T>): PreviewFactory<T> {
  if (executions[id] != null) return executions[id];
  const context = { exports: {} as any }; // exports.default would be set in the preview module.
  const prevExports = module.exports;

  module.exports = {};
  fn.call(module, context.exports, require, module, '', '');
  module.exports = prevExports;

  return (executions[id] = context.exports.default);
}

export function execute(fileName: string, previewName: string): PreviewFactory {
  return doExecute(`${fileName}:${previewName}`, compile(fileName, previewName));
}

export function executeAsApp(fileName: string, previewName: string): PreviewFactory<App> {
  return doExecute(`app:${fileName}:${previewName}`, compileAsApp(fileName, previewName));
}
