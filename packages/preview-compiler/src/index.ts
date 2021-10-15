import type { NodeTransform } from '@vue/compiler-core';
import { compile as baseCompile } from '@vue/compiler-dom';
import {
  isAttributeNode,
  isDirectiveNode,
  isElementNode,
  isRootNode,
  isSimpleExpressionNode,
} from '@vuedx/template-ast-types';
import * as Path from 'path';

interface SetupOutput {
  components: string;
  requests: string;
  state: string;
  async?: boolean;
}

function createPreviewSetupTransform(output: SetupOutput): NodeTransform {
  return (node, context) => {
    if (isRootNode(node)) {
      context.addIdentifiers('$p');
    } else if (isRootNode(context.parent) && isElementNode(node) && node.tag === 'setup') {
      context.removeNode();

      node.props.forEach((prop) => {
        if (isAttributeNode(prop)) {
          output.async = prop.value != null ? prop.value.content.toLowerCase() === 'true' : true;
        } else if (isDirectiveNode(prop) && prop.name === 'bind') {
          if (isSimpleExpressionNode(prop.arg) && prop.arg.isStatic) {
            if (
              prop.arg.content === 'components' ||
              prop.arg.content === 'requests' ||
              prop.arg.content === 'state'
            ) {
              if (prop.exp != null) {
                output[prop.arg.content] = prop.exp.loc.source;
              }
            }
          }
        }
      });
    }
  };
}

export interface CompileOptions {
  componentFileName: string;
  allowOverrides?: boolean | string;
  attrs?: Record<string, string | boolean>;
  imports?: Record<string, string>;
  hmrId?: string;
}

export function compile(
  content: string,
  { componentFileName, hmrId, allowOverrides, attrs = {}, imports = {} }: CompileOptions
): string {
  const setup: SetupOutput = {
    components: '{}',
    requests: '{}',
    state: '{}',
  };
  const result = baseCompile(content, {
    inline: false,
    mode: 'module',
    sourceMap: false,
    hoistStatic: true,
    cacheHandlers: true,
    expressionPlugins: ['typescript', 'dynamicImport'],
    nodeTransforms: [createPreviewSetupTransform(setup)],
  });
  const componentName = (componentFileName.split(Path.sep).pop() ?? 'self').replace(/\.vue$/, '');

  const preamble = getCode(
    result.preamble,
    `import * as _Vue from ${JSON.stringify(imports['vue'] ?? 'vue')}`,
    `import * as _Preview from ${JSON.stringify(
      imports['@vuedx/preview-provider'] ?? '@vuedx/preview-provider'
    )}`,
    `import _component_self from '${componentFileName.replace(/\\/g, '/')}'`,
    `_Preview.installFetchInterceptor()`,
    result.code
  );

  const source = `_Vue.defineComponent({
  name: 'Preview(${componentName}):${String(attrs['name'] ?? 'unnamed')}',
  inheritAttrs: false,
  _file: ${JSON.stringify(componentFileName)},
  components: { "${componentName}": _component_self },
  ${setup.async === true ? 'async ' : ''}setup() {
    _Preview.setActiveComponent({
      ...(${JSON.stringify(attrs)}),
      componentName: "${componentName}",
    })
    const $p = { 
      ..._Preview.provider,
      attrs: ${JSON.stringify(attrs)}, 
      state: _Vue.reactive(_overrides.state != null ? _overrides.state : ${setup.state}), 
      x: _Vue.inject('preview:UserProviders', null),
    }
    
    _Preview.useRequests({ ...(${setup.requests}), ..._overrides.requests })
    _Preview.useComponents({...(${setup.components}), ..._overrides.components})

    return { preview: $p }
  },
  created() {
    this.$p = this.preview
  },
  render,
})`.trim();

  if (hmrId != null) {
    return getCode(
      preamble,
      `const _overrides = {}`,
      `const _preview_main = ${source}`,
      generateHMR(hmrId),
      `export default _preview_main`
    );
  } else if (allowOverrides != null) {
    const fn = typeof allowOverrides === 'string' ? allowOverrides : '';
    return getCode(preamble, `export default (_overrides = {}) => ${fn}(${source})`);
  } else {
    return getCode(preamble, `export default (${source})`);
  }
}

function generateHMR(hmrId: string): string {
  return `  
_preview_main.__hmrId = '${hmrId}'
typeof __VUE_HMR_RUNTIME__ !== 'undefined' && __VUE_HMR_RUNTIME__.createRecord(_preview_main.__hmrId, _preview_main)
if (import.meta.hot) {
  import.meta.hot.accept(({ default: updated }) => {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated)
  })
}`.trim();
}

function getCode(...lines: Array<string | undefined>): string {
  return lines.filter(Boolean).join('\n');
}
