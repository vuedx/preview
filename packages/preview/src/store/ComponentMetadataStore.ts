import type { ComponentInfo, createFullAnalyzer } from '@vuedx/analyze';
import type { SFCBlock } from '@vuedx/compiler-sfc';
import createDebugger from 'debug';
import * as Path from 'path';
import type { DescriptorStore } from './DescriptorStore';
import type { FileSystemHost } from './FileSystemHost';

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

  constructor(
    public root: string,
    private readonly descriptors: DescriptorStore,
    private readonly fs: FileSystemHost
  ) {
    import('@vuedx/analyze')
      .then((analyze) => {
        debug('Static code analyze is ready');
        this.analyzer = analyze.createFullAnalyzer();
      })
      .catch((error) => {
        debug('Cannot initialize static code analyzer due to an error', error);
      });
  }

  public isSupported(fileName: string): boolean {
    return (
      (Path.isAbsolute(fileName) ? fileName.startsWith(this.root) : !fileName.startsWith('..')) &&
      (fileName.endsWith('.vue') || fileName.endsWith('.vue.p'))
    );
  }

  private getAbsolutePath(fileName: string): string {
    if (Path.isAbsolute(fileName)) return fileName;
    return Path.resolve(this.root, fileName.replace(/[\\/]/g, Path.sep));
  }

  private normalize(fileName: string): string {
    return fileName.replace(/\\/g, '/');
  }

  private getVueFile(fileName: string): string {
    return fileName.replace(/\.vue\.p$/, '.vue');
  }

  public async get(fileName: string): Promise<Readonly<ComponentMetadata | undefined>> {
    fileName = this.getVueFile(fileName);
    const absFileName = this.getAbsolutePath(fileName);
    const metadata = this.components.get(absFileName);
    if (metadata == null) {
      if (this.isSupported(fileName) && (await this.fs.exists(absFileName))) {
        await this.add(absFileName);
        const metadata = this.components.get(absFileName);
        if (metadata != null) return metadata;
      }
    }
    return metadata;
  }

  public async add(fileName: string): Promise<void> {
    fileName = this.getVueFile(fileName);
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

    await this.reload(fileName);
  }

  public remove(fileName: string): void {
    fileName = this.getVueFile(fileName);
    this.text = '';
    this.components.delete(this.getAbsolutePath(fileName));
  }

  public async reload(fileName: string): Promise<void> {
    fileName = this.getVueFile(fileName);

    this.text = '';

    const absFileName = this.getAbsolutePath(fileName);
    const component = this.components.get(absFileName);
    if (component != null) {
      try {
        // TODO: Make it lazy, on-demand.
        void this.analyzer;
        // component.info = this.analyzer?.analyze(
        //   await this.fs.readFile(fileName),
        //   this.normalize(absFileName)
        // );
      } catch {
        // Ignore errors for now
        // TODO: Maybe add telemetry to collect such errors.
      }
      component.previews = await this.parse(fileName);
    }
  }

  private async parse(fileName: string): Promise<PreviewMetadata[]> {
    const descriptor = await this.descriptors.get(fileName);
    const blocks: SFCBlock[] = descriptor.previews;

    return blocks.map((block, instanceId): PreviewMetadata => {
      const { name, device, ...props } = block.attrs;

      return {
        id: instanceId,
        name: typeof name === 'string' ? name : `Preview ${instanceId}`,
        device: typeof device === 'string' ? device : 'freeform',
        deviceProps: props,
      };
    });
  }

  public getText(): string {
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
