import { parse as parseQueryString } from 'querystring';

export const enum ComponentResourceType {
  ENTRY = '@preview/entry.js',
  COMPONENT = '@preview/component.js',
  META = '@preview/meta.js',
}

export const SHELL_PREFIX = `/@preview:shell`;
export const IFRAME_PREFIX = `/@preview:iframe`;

export const enum ResourceType {
  LIST_COMPONENTS = '@preview/components.js',
  USER_SETUP = '@preview/user/setup.js',
}

export type ComponentResource = {
  type: ComponentResourceType;
  fileName: string;
  index?: number;
};

const PREFIX_RE = /^\/?@preview\//;
export function parsePreviewResource(uri: string): ComponentResource | undefined {
  if (PREFIX_RE.test(uri)) {
    uri = uri.replace(/^\/?/, '');
    const i = uri.indexOf('?');
    const type = uri.substr(0, i);

    const query = getQueryObject(uri.substr(i + 1));
    const index = parseInt(String(query['index']));

    if (type === '' || query['fileName'] == null) return undefined;

    return {
      type: type as any,
      fileName: String(query['fileName']),
      index: Number.isInteger(index) ? index : undefined,
    };
  }

  return undefined;
}

export function parseURI(
  uri: string
): { fileName: string; query: Record<string, string | boolean> } {
  const index = uri.indexOf('?');
  if (index >= 0) {
    const fileName = uri.substr(0, index);
    const query = getQueryObject(uri.substr(index + 1));

    return { fileName, query };
  }

  return { fileName: uri, query: {} };
}

function getQueryObject(uri: string): Record<string, string | boolean> {
  const parsed = parseQueryString(uri);
  const query: Record<string, string | boolean> = {};
  Object.keys(parsed).forEach((key) => {
    const value = parsed[key];
    query[key] = Array.isArray(value) ? value.join(',') : value ?? true;
  });
  return query;
}

export function resourceToID(resource: ComponentResource): string {
  return `${resource.type}?fileName=${resource.fileName}&index=${resource.index ?? ''}`;
}

export function resourceToFile(resource: ComponentResource): string {
  return `/${resourceToID(resource)}`;
}
