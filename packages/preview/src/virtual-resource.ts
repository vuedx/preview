import { parse as parseQueryString } from 'querystring';

export const enum ComponentScopedResourceType {
  COMPONENT_APP = 'component/app.js',
  COMPONENT_INSTANCE = 'component/instance.js',
  COMPONENT_META = 'component/meta.js',
  COMPONENT_HTML_PAGE = 'component/app.html'
}
export const enum PrefixedResourceType {
  SHELL = 'shell'
}
export const enum InternalResoruceType {
  LIST_COMPONENTS = 'components.js',
  USER_SETUP = 'user/setup.js'
}
type VirtualResourceID = `@preview:${ComponentScopedResourceType}?fileName=${string}&index=${number | ''}` |
  `@preview:${InternalResoruceType}` |
  `@preview:${PrefixedResourceType}/${string}`;
type VirtualResourceURI = VirtualResourceID | `/${VirtualResourceID}`;
const NAMESPACE_RE = /^\/?@preview:/;
type VirtualResource = {
  type: PrefixedResourceType;
  fileName: string;
} |
{
  type: ComponentScopedResourceType;
  fileName: string;
  index?: number;
} |
{
  type: InternalResoruceType;
};
export function isVirtualResource(id: string): id is VirtualResourceURI {
  return NAMESPACE_RE.test(id);
}
export function parseVirtualResourceURI(id: VirtualResourceURI): VirtualResource {
  const source = id.replace(NAMESPACE_RE, '');

  if (source.startsWith(PrefixedResourceType.SHELL)) {
    const offset = source.indexOf('/');
    const type = source.substr(0, offset) as PrefixedResourceType;
    const fileName = source.substring(offset + 1);

    return { type, fileName };
  } else if (source.startsWith(InternalResoruceType.LIST_COMPONENTS) ||
    source.startsWith(InternalResoruceType.USER_SETUP)) {
    return { type: source.replace(/\?.*$/, '') as InternalResoruceType };
  } else {
    const offset = source.indexOf('?');
    const type = source.substring(0, offset) as ComponentScopedResourceType;
    const query = source.substring(offset + 1);

    let parsed = parseQueryString(query);
    const fileName = parsed.fileName;
    let index = parseInt(String(parsed.index));

    return { type, fileName: String(fileName), index: Number.isInteger(index) ? index : undefined };
  }
}
export function resourceToURI(resource: VirtualResource): VirtualResourceURI {
  return `/${resourceToID(resource)}` as const;
}
export function resourceToID(resource: VirtualResource): VirtualResourceID {
  switch (resource.type) {
    case ComponentScopedResourceType.COMPONENT_APP:
    case ComponentScopedResourceType.COMPONENT_HTML_PAGE:
    case ComponentScopedResourceType.COMPONENT_INSTANCE:
    case ComponentScopedResourceType.COMPONENT_META:
      return `@preview:${resource.type}?fileName=${resource.fileName}&index=${resource.index != null ? resource.index : ''}` as const;
    case PrefixedResourceType.SHELL:
      return `@preview:${resource.type}/${resource.fileName}` as const;
    default:
      return `@preview:${resource.type}` as const;
  }
}
