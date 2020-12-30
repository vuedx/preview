import { parse, SFCDescriptor } from '@vuedx/compiler-sfc';
import FS from 'fs';

export class DescriptorStore {
  private cache = new Map<string, SFCDescriptor>();
  private prevContent = new Map<string, string>();

  get(fileName: string, content?: string): SFCDescriptor {
    if (!this.cache.has(fileName)) {
      return this.set(fileName, content ?? FS.readFileSync(fileName, 'utf-8'));
    } else if (content != null) {
      return this.set(fileName, content);
    }

    return this.cache.get(fileName);
  }

  set(fileName: string, content: string): SFCDescriptor {
    const prevContent = this.prevContent.get(fileName);
    if (prevContent !== content) {
      this.prevContent.set(fileName, content);
      const { descriptor } = parse(content, { filename: fileName, sourceMap: false });
      this.cache.set(fileName, descriptor);
      return descriptor;
    } else {
      return this.cache.get(fileName);
    }
  }
}
