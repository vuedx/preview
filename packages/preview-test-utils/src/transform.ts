import { transformSync as transform } from '@babel/core';
import { parse, SFCDescriptor } from '@vuedx/compiler-sfc';
import { compile } from '@vuedx/preview-compiler';
import FS from 'fs';
import Path from 'path';

class DescriptorStore {
  private cache = new Map<string, SFCDescriptor>();
  private prevContent = new Map<string, string>();

  get(fileName: string, content?: string): SFCDescriptor {
    const descriptor = this.cache.get(fileName);
    if (descriptor == null) {
      return this.set(fileName, content ?? FS.readFileSync(fileName, 'utf-8'));
    } else if (content != null) {
      return this.set(fileName, content);
    }

    return descriptor;
  }

  set(fileName: string, content: string): SFCDescriptor {
    const prevContent = this.prevContent.get(fileName);
    const descriptor = this.cache.get(fileName);
    if (prevContent !== content || descriptor == null) {
      this.prevContent.set(fileName, content);
      const { descriptor } = parse(content, { filename: fileName, sourceMap: false });
      this.cache.set(fileName, descriptor);
      return descriptor;
    } else {
      return descriptor;
    }
  }
}
const store = new DescriptorStore();

const configCache: Array<[string, string]> = [];
export function findPreviewConfig(fileName: string): string | undefined {
  const config = configCache.find(([dir]) => fileName.startsWith(dir));
  if (config != null) return config[1];
  let dirName = Path.dirname(fileName);
  while (dirName != Path.dirname(dirName)) {
    const configs = [Path.resolve(dirName, 'preview.ts'), Path.resolve(dirName, 'preview.js')];
    const configFile = configs.find((fileName) => FS.existsSync(fileName));
    if (configFile != null) {
      configCache.push([dirName, configFile]);
      return configFile;
    }

    dirName = Path.dirname(dirName);
  }
}

export function generatePreviewComponent(
  fileName: string,
  previewName: string,
  isAppMode: boolean = false
) {
  const descriptor = store.get(fileName);
  const block = descriptor.customBlocks.find(
    (block) => block.type === 'preview' && block.attrs.name === previewName
  );
  if (block == null) throw new Error(`Cannot find preview: "${previewName}" in ${fileName}`);

  let preamble = '';

  if (isAppMode) {
    const configFile = findPreviewConfig(fileName);
    if (configFile != null) {
      const importSource = configFile.replace(/\.(ts|js)$/, '');
      preamble = [
        `import * as _preview from '${importSource}'`,
        `import * as _vue from 'vue'`,
        `function _createApp(component) {`,
        `  const createApp = typeof _preview.createApp === 'function'`,
        `    ? _preview.createApp`,
        `    : _vue.createApp`,
        `  const app = createApp(component)`,
        `  if (_preview.x != null) {`,
        `    app.provide('preview:UserProviders', _preview.x)`,
        `  }`,
        `  return app`,
        `}`,
        ``,
      ].join('\n');
    } else {
      preamble = `import { createApp as _createApp } from 'vue'\n`;
    }
  }

  const code =
    preamble +
    compile(block.content, {
      componentFileName: fileName,
      allowOverrides: isAppMode ? '_createApp' : true,
    });

  return (
    transform(code, {
      filename: fileName,
      presets: ['babel-preset-jest'],
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    })?.code || code
  );
}
