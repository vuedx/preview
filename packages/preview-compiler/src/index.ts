import type { NodeTransform } from '@vue/compiler-core';
import { compile as baseCompile } from '@vue/compiler-dom';
import {
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
}

function createPreviewSetupTransform(output: SetupOutput): NodeTransform {
  return (node, context) => {
    if (isRootNode(node)) {
      context.addIdentifiers('$p');
    } else if (isRootNode(context.parent) && isElementNode(node) && node.tag === 'setup') {
      context.removeNode();

      node.props.forEach((prop) => {
        if (isDirectiveNode(prop) && prop.name === 'bind') {
          if (isSimpleExpressionNode(prop.arg) && prop.arg.isStatic) {
            if (
              prop.arg.content === 'components' ||
              prop.arg.content === 'requests' ||
              prop.arg.content === 'state'
            ) {
              if (isSimpleExpressionNode(prop.exp)) {
                output[prop.arg.content] = prop.exp.content;
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
  hmrId?: string;
}

export function compile(
  content: string,
  { componentFileName, hmrId, allowOverrides, attrs = {} }: CompileOptions
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
    nodeTransforms: [createPreviewSetupTransform(setup)],
  });
  const componentName = (componentFileName.split(Path.sep).pop() ?? 'self').replace(/\.vue$/, '');

  const preamble = getCode(
    result.preamble,
    `import { defineComponent, reactive, inject } from 'vue'`,
    `import { provider, useRequests, useComponents, installFetchInterceptor } from '@vuedx/preview-provider'`,
    `import _component_self from '${componentFileName.replace(/\\/g, '/')}'`,
    `installFetchInterceptor()`,
    result.code
  );

  const source = `defineComponent({
  name: 'Preview',
  components: { "${componentName}": _component_self },
  setup() {
    const preview = { 
      ...provider,
      attrs: ${JSON.stringify(attrs)}, 
      state: reactive(overrides.state != null ? overrides.state : ${setup.state}), 
      x: inject('preview:UserProviders', null),
    }
  
    useRequests({ ...(${setup.requests}), ...overrides.requests })
    useComponents({...(${setup.components}), ...overrides.components})

    return { preview, p: preview }
  },
  created() {
    this.$p = this.preview
  },
  render,
})`.trim();

  if (hmrId != null) {
    return getCode(
      preamble,
      `const overrides = {}`,
      `const _preview_main = ${source}`,
      generateHMR(hmrId),
      `export default _preview_main`
    );
  } else if (allowOverrides != null) {
    const fn = typeof allowOverrides === 'string' ? allowOverrides : '';
    return getCode(preamble, `export default (overrides = {}) => ${fn}(${source})`);
  } else {
    return getCode(preamble, `export default (${source})`);
  }
}

function generateHMR(hmrId: string) {
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
