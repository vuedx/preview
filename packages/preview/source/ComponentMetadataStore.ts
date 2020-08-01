import * as Path from 'path';
import { ComponentModule } from '../browser/types';
export const devices = {
  phone: 'iPhone X',
  tablet: 'iPad Pro 12.9"',
  desktop: 'MacBook Pro 16"',
};
export function resolveCompiler() {
  return require(require('vite/dist/node/utils/resolveVue').resolveVue(process.cwd()).compiler);
}

export function s(value: any) {
  return JSON.stringify(value);
}

export class ComponentMetadataStore {
  private components = new Map<string, Omit<ComponentModule, 'loader'>>();
  private text: string;

  constructor(public root: string) {}

  get(fileName: string): Readonly<Omit<ComponentModule, 'loader'>> {
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
    const { parse } = resolveCompiler();
    const { descriptor } = parse(content, { filename: fileName });

    component.previews = [];
    descriptor.customBlocks.forEach((block, index) => {
      if (block.type === 'preview') {
        const name = block.attrs.name || `Preview ${index}`;
        const device = devices[block.attrs.device] || 'iPhone X';

        component.previews.push({ name, device });
      }
    });
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
            `  previews: ${s(component.previews)},`,
            `})`,
          ].join('\n')
        )
        .join('\n'),
    ].join('\n');

    return this.text;
  }
}
