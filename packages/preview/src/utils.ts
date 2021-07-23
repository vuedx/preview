import type { PropInfo } from '@vuedx/analyze';
import * as Path from 'path';

export function getPreviewShellPath(): string {
  const pkgPath = require.resolve('@vuedx/preview-shell/package.json');
  return Path.resolve(Path.dirname(pkgPath), 'dist');
}
export function getProviderPath(): string {
  const pkgPath = require.resolve('@vuedx/preview-provider/package.json');
  const pkg = require(pkgPath);

  return Path.resolve(Path.dirname(pkgPath), pkg.module);
}
export function getComponentName(fileName: string): string {
  const name = Path.basename(fileName)
    .replace(/\.vue$/, '')
    .replace(/[^a-z0-9]+([a-z])/i, (_, char) => char.toUpperCase());

  return name.charAt(0).toUpperCase() + name.substr(1);
}
export function getPropValue(prop: PropInfo): string {
  if (prop.defaultValue != null) {
    switch (prop.defaultValue.kind) {
      case 'value':
        return prop.defaultValue.value;

      case 'function':
        return `(${prop.defaultValue.expression})()`;
    }
  }

  if (prop.type.length === 1) {
    const type = prop.type[0];
    if (type == null) {
      return 'null';
    } else if (type.kind === 'string') {
      return '$p.string()';
    } else if (type.kind === 'number') {
      return '$p.number()';
    } else if (type.kind === 'boolean') {
      return '$p.bool()';
    } else if (type.kind === 'enum') {
      return `(${JSON.stringify(type.values)})[$p.number.int.in(0, ${type.values.length - 1})]`;
    }
  }

  return 'null';
}
