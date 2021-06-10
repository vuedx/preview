import { DescriptorStore } from './DescriptorStore';
import { compile } from '@vuedx/preview-compiler';
import crypto from 'crypto';

export class PreviewCompilerStore {
  constructor(private descriptors: DescriptorStore) {}

  compile(fileName: string, index: number): string {
    const block = this.descriptors.get(fileName).customBlocks[index];
    if (block == null) return `throw new Error('No such preview: ${fileName} { index: ${index} }')`;

    return this.compileText(block.content, fileName, `${fileName}:${index}`, block.attrs);
  }

  compileText(
    content: string,
    fileName: string,
    id: string = fileName + ':auto',
    attrs: Record<string, string | boolean> = {}
  ): string {
    return compile(content, {
      componentFileName: fileName,
      hmrId: crypto.createHash('md5').update(id).digest('hex').substr(0, 32),
      attrs,
    });
  }
}
