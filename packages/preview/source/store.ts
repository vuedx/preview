import { ComponentInfo, createFullAnalyzer } from '@vuedx/analyze';
import * as Path from 'path';

interface PreviewMetadata {
  id: string;
  index: number;
  name?: string;
  device: string;
}

interface ComponentMetadata {
  id: string;
  name: string;
  path: string;
  info: ComponentInfo;
  previews: PreviewMetadata[];
}

export function resolveCompiler() {
  return require(require('vite/dist/node/utils/resolveVue').resolveVue(process.cwd()).compiler);
}

export function s(value: any) {
  return JSON.stringify(value);
}

export class ComponentMetadataStore {
  private text: string;
  private components = new Map<string, Omit<ComponentMetadata, 'loader' | 'docgen'>>();
  private analyzer = createFullAnalyzer();

  constructor(public root: string) {}

  get(fileName: string): Readonly<ComponentMetadata> {
    return this.components.get(fileName) ?? this.components.get(Path.resolve(this.root, fileName));
  }

  add(fileName: string, content: string): void {
    const relativeFileName = Path.relative(this.root, fileName);

    this.text = '';

    this.components.set(fileName, {
      id: relativeFileName.replace(/\.vue$/, ''),
      name: Path.basename(fileName).replace(/\.vue$/, ''),
      path: relativeFileName,
      info: null as any,
      previews: [],
    });

    this.reload(fileName, content);
  }

  remove(fileName: string): void {
    this.text = '';
    this.components.delete(fileName);
  }

  reload(fileName: string, content: string): void {
    this.text = '';

    const component = this.components.get(fileName);

    component.info = this.analyzer.analyze(content, fileName);
    component.previews = this.parse(content, fileName);
  }

  private parse(content: string, fileName: string) {
    const { parse } = resolveCompiler();
    const { descriptor } = parse(content, { filename: fileName });
    const relativeFileName = Path.relative(this.root, fileName);
    let index = 0;

    return descriptor.customBlocks
      .map((block, i) => {
        if (block.type === 'preview') {
          return {
            id: `/${relativeFileName}?type=custom&index=${i}&blockType=preview`,
            index: index++,
            name: block.attrs.name,
            device: block.attrs.device ?? 'freeform',
          };
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

    this.text =
      `export const components = [\n` +
      components
        .map((component) =>
          [
            `  { `,
            `    id: ${s(component.id)},`,
            `    name: ${s(component.name)},`,
            `    path: ${s(component.path)},`,
            `    previews: ${JSON.stringify(component.previews, null, 6)},`,
            `  }`,
          ].join('\n')
        )
        .join(',\n') +
      `\n]`;

    return this.text;
  }
}
