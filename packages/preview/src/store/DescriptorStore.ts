import { parse, SFCBlock, SFCDescriptor } from '@vuedx/compiler-sfc';
import type { FileSystemHost } from './FileSystemHost';

export interface ExtendedSFCDescriptor {
  descriptor: SFCDescriptor;
  previews: SFCBlock[];
}

export class DescriptorStore {
  private readonly descriptors = new Map<string, ExtendedSFCDescriptor>();
  private readonly files = new Map<string, [string, string]>();

  constructor(private readonly fs: FileSystemHost) {}

  public async get(fileName: string): Promise<ExtendedSFCDescriptor> {
    return this.getOrNull(fileName) ?? (await this.reload(fileName));
  }

  public getOrNull(fileName: string): ExtendedSFCDescriptor | null {
    return this.descriptors.get(fileName) ?? null;
  }

  private async read(fileName: string): Promise<[string, string]> {
    const isVue = await this.fs.exists(fileName);
    const isPreview = await this.fs.exists(`${fileName}.p`);

    if (isVue && isPreview) {
      return [await this.fs.readFile(fileName), await this.fs.readFile(`${fileName}.p`)];
    } else if (isVue) {
      return [await this.fs.readFile(fileName), ''];
    } else if (isPreview) {
      return ['', await this.fs.readFile(`${fileName}.p`)];
    } else {
      return ['', ''];
    }
  }

  public async reload(fileName: string): Promise<ExtendedSFCDescriptor> {
    const prevDescriptor = this.descriptors.get(fileName);
    const prevContent = this.files.get(fileName);
    const nextContent = await this.read(fileName);
    if (
      prevDescriptor == null ||
      prevContent == null ||
      prevContent[0] !== nextContent[0] ||
      prevContent[1] !== nextContent[1]
    ) {
      this.files.set(fileName, nextContent);
      const vue = parse(nextContent[0], { filename: fileName, sourceMap: false });
      const preview = parse(nextContent[1], { filename: fileName, sourceMap: false });

      const descriptor: ExtendedSFCDescriptor = {
        descriptor: vue.descriptor,
        previews: [...getPreviewsBlocks(preview.descriptor), ...getPreviewsBlocks(vue.descriptor)],
      };

      this.descriptors.set(fileName, descriptor);

      return descriptor;
    } else {
      return prevDescriptor;
    }
  }
}

function getPreviewsBlocks(descriptor: SFCDescriptor): SFCBlock[] {
  return descriptor.customBlocks.filter((block: SFCBlock) => block.type === 'preview');
}
