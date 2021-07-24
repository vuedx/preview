import type { ComponentInfo, createFullAnalyzer } from '@vuedx/analyze';
import type { SFCBlock } from '@vuedx/compiler-sfc';
import * as Path from 'path';
import * as FS from 'fs';
import type { DescriptorStore } from './DescriptorStore';
import createDebugger from 'debug';

const debug = createDebugger('@vuedx/preview:component-metadata');

interface PreviewMetadata {
  id: number;
  name: string;
  device: string;
  deviceProps: Record<string, string | boolean>;
}

interface ComponentMetadata {
  id: string;
  name: string;
  path: string;
  info?: ComponentInfo;
  previews: PreviewMetadata[];
}

export function s(value: any, indent = 0): string {
  return JSON.stringify(value, null, indent);
}

export class ComponentMetadataStore {
  private text: string = '';
  private readonly components = new Map<string, Omit<ComponentMetadata, 'loader' | 'docgen'>>();

  private analyzer?: ReturnType<typeof createFullAnalyzer>;

  constructor(public root: string, private readonly descriptors: DescriptorStore) {
    import('@vuedx/analyze')
      .then((analyze) => {
        debug('Static code analyze is ready');
        this.analyzer = analyze.createFullAnalyzer();
      })
      .catch((error) => {
        debug('Cannot initialize static code analyzer due to an error', error);
      });
  }

  isSupported(fileName: string): boolean {
    return (
      (Path.isAbsolute(fileName) ? fileName.startsWith(this.root) : !fileName.startsWith('..')) &&
      fileName.endsWith('.vue')
    );
  }

  private getAbsolutePath(fileName: string): string {
    if (Path.isAbsolute(fileName)) return fileName;
    return Path.resolve(this.root, fileName.replace(/[\\/]/g, Path.sep));
  }

  private normalize(fileName: string): string {
    return fileName.replace(/\\/g, '/');
  }

  get(fileName: string): Readonly<ComponentMetadata | undefined> {
    const absFileName = this.getAbsolutePath(fileName);
    const metadata = this.components.get(absFileName);
    if (metadata == null) {
      if (this.isSupported(fileName) && FS.existsSync(absFileName)) {
        this.add(absFileName, FS.readFileSync(absFileName, 'utf-8'));
        const metadata = this.components.get(absFileName);
        if (metadata != null) return metadata;
      }
    }
    return metadata;
  }

  add(fileName: string, content: string): void {
    const absFileName = this.getAbsolutePath(fileName);
    const relativeFileName = this.normalize(Path.relative(this.root, absFileName));
    const id = relativeFileName.replace(/\.vue$/, '');

    this.text = '';

    this.components.set(absFileName, {
      id: id,
      name: Path.posix.basename(id),
      path: relativeFileName,
      info: null as any,
      previews: [],
    });

    this.reload(fileName, content);
  }

  remove(fileName: string): void {
    this.text = '';
    this.components.delete(this.getAbsolutePath(fileName));
  }

  reload(fileName: string, content: string): void {
    this.text = '';

    const absFileName = this.getAbsolutePath(fileName);
    const component = this.components.get(absFileName);
    if (component != null) {
      try {
        // TODO: Make it lazy, on-demand.
        component.info = this.analyzer?.analyze(content, this.normalize(absFileName));
      } catch {
        // Ignore errors for now
        // TODO: Maybe add telemetry to collect such errors.
      }
      component.previews = this.parse(content, absFileName);
    }
  }

  private parse(content: string, absFileName: string): PreviewMetadata[] {
    const descriptor = this.descriptors.get(absFileName, content);
    const blocks: SFCBlock[] = descriptor.customBlocks;
    let index = 0;

    return blocks
      .map((block, instanceId): PreviewMetadata | undefined => {
        if (block.type === 'preview') {
          index += 1;

          const { name, device, ...props } = block.attrs;

          return {
            id: instanceId,
            name: typeof name === 'string' ? name : `Preview ${index}`,
            device: typeof device === 'string' ? device : 'freeform',
            deviceProps: props,
          };
        }

        return undefined;
      })
      .filter((item): item is PreviewMetadata => item != null);
  }

  getText(): string {
    if (this.text !== '') {
      return this.text;
    }

    const components = Array.from(this.components.values());

    components.sort((a, b) => a.name.localeCompare(b.name));

    this.text = `export const components = ${s(
      components.map(({ info, ...component }) => component),
      2
    )}
    
    function setComponents(components) {
      window.components = components
      window.dispatchEvent(new CustomEvent('preview:components', { detail: components }))
    }
    
    setComponents(components)

    if (import.meta.hot) {
      import.meta.hot.accept(({ components }) => {
        setComponents(components)
      })
    }
    `;

    return this.text;
  }
}
