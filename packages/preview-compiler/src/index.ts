import type { NodeTransform } from '@vue/compiler-core';
import { compile as baseCompile } from '@vue/compiler-dom';
import {
  isDirectiveNode,
  isElementNode,
  isRootNode,
  isSimpleExpressionNode,
} from '@vuedx/template-ast-types';
import Path from 'path';

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
  hmrId?: string;
}

export function compile(
  content: string,
  { componentFileName, hmrId, allowOverrides }: CompileOptions
): string {
  const setup: SetupOutput = {
    components: '{}',
    requests: '{}',
    state: '{}',
  };
  const result = baseCompile(content, {
    inline: true,
    mode: 'module',
    sourceMap: false,
    hoistStatic: true,
    cacheHandlers: true,
    nodeTransforms: [createPreviewSetupTransform(setup)],
  });
  const componentName = Path.basename(componentFileName).replace(/\.vue$/, '');

  const preamble = getCode(
    result.preamble,
    `import { defineComponent, reactive, inject } from 'vue'`,
    `import { provider, useRequests, useComponents, installFetchInterceptor } from '@vuedx/preview-provider'`,
    `import ${componentName} from '${componentFileName}'`,
    `installFetchInterceptor()`
  );

  const source = `defineComponent({
  name: 'Preview',
  components: { ${componentName} },
  setup() {
    const $p = { 
      ...provider, 
      state: reactive(overrides.state != null ? overrides.state : ${setup.state}), 
      x: inject('@preview:UserProviders', null),
    }
  
    useRequests({ ...(${setup.requests}), ...overrides.requests })
    useComponents({...(${setup.components}), ...overrides.components})
  
    return (${result.code})
  },
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
if (import.meta.hot) {
  _preview_main.__hmrId = '${hmrId}'
  __VUE_HMR_RUNTIME__.createRecord(_preview_main.__hmrId, _preview_main)
  import.meta.hot.accept(({ default: updated }) => {
    __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated)
  })
}`.trim();
}

function getCode(...lines: Array<string | undefined>): string {
  return lines.filter(Boolean).join('\n');
}
