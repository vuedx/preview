import * as Path from 'path';
import * as QuickLRU from 'quick-lru';
import { ComponentModule } from '../browser/types';
export function resolveCompiler() {
  return require(require('vite/dist/node/utils/resolveVue').resolveVue(process.cwd()).compiler);
}

export function s(value: any) {
  return JSON.stringify(value);
}

export class ComponentMetadataStore {
  private components = new Map<string, Omit<ComponentModule, 'loader' | 'docgen'>>();
  private text: string;
  private cache = new QuickLRU<string, { name: string; device: string }[]>({ maxSize: 1000 });
  constructor(
    public root: string,
    public devices = {
      phone: 'iPhone X',
      tablet: 'iPad Pro 12.9"',
      desktop: 'MacBook Pro 16"',
    }
  ) {}

  get(fileName: string): Readonly<Omit<ComponentModule, 'loader' | 'docgen'>> {
    return this.components.get(fileName);
  }

  add(fileName: string, content: string) {
    const relativeFileName = Path.relative(this.root, fileName);

    this.components.set(fileName, {
      id: relativeFileName.replace(/\.vue$/, ''),
      name: Path.basename(fileName).replace(/\.vue$/, ''),
      path: relativeFileName,
      previews: [],
    });
    this.text = '';
    this.reload(fileName, content);
  }

  remove(fileName: string) {
    this.text = '';
    this.components.delete(fileName);
  }

  reload(fileName: string, content: string) {
    this.text = '';

    const component = this.components.get(fileName);

    if (this.cache.has(content)) {
      component.previews = this.cache.get(content);
    } else {
      this.cache.set(content, (component.previews = this.parse(fileName, content)));
    }
  }

  private parse(fileName: string, content: string) {
    const { parse } = resolveCompiler();
    const { descriptor } = parse(content, { filename: fileName });
    return descriptor.customBlocks
      .map((block, index) => {
        if (block.type === 'preview') {
          const name = block.attrs.name || `Preview ${index}`;
          const device = this.devices[block.attrs.device] || 'iPhone X';

          return { name, device };
        }
      })
      .filter(Boolean);
  }

  getText() {
    if (this.text) {
      return this.text;
    }

    const components = Array.from(this.components.values());

    components.sort((a, b) => a.name.localeCompare(b.name));

    this.text = [
      `export const components = []`,
      components
        .map((component) =>
          [
            `components.push({ `,
            `  id: ${s(component.id)},`,
            `  name: ${s(component.name)},`,
            `  path: ${s(component.path)},`,
            `  loader: () => import(${s('/' + component.path)}),`,
            `  docgen: () => import(${s('/' + component.path + '.__docgen__')}),`,
            `  previews: ${s(component.previews)},`,
            `})`,
          ].join('\n')
        )
        .join('\n'),
    ].join('\n');

    return this.text;
  }
}
