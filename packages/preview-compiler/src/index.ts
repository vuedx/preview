import { compile as baseCompile, NodeTransform } from '@vue/compiler-dom';
import Path from 'path';
import {
  isRootNode,
  isElementNode,
  isDirectiveNode,
  isSimpleExpressionNode,
} from '@vuedx/template-ast-types';

interface SetupOutput {
  components?: string;
  requests?: string;
  state?: string;
}

function createPreviewSetupTransform(output: SetupOutput): NodeTransform {
  return (node, context) => {
    if (isRootNode(node)) {
      context.addIdentifiers('$p');
    } else if (isElementNode(node) && isRootNode(context.parent) && node.tag === 'setup') {
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

export function compile(content: string, componentFileName: string, id?: string): string {
  const setup: SetupOutput = {};
  const result = baseCompile(content, {
    inline: true,
    mode: 'module',
    sourceMap: false,
    hoistStatic: true,
    cacheHandlers: true,
    nodeTransforms: [createPreviewSetupTransform(setup)],
  });
  const componentName = Path.basename(componentFileName).replace(/\.vue$/, '');

  return `
${result.preamble}
import { defineComponent, reactive, inject } from 'vue'
import { provider, useRequests, useComponents } from '@vuedx/preview-provider'
import ${componentName} from '${componentFileName}'

const _sfc_main = defineComponent({
  components: { ${componentName} },
  setup() {
    const $p = { 
      ...provider, 
      state: reactive(${setup.state ?? '{}'}), 
      x: inject('@preview:UserProviders'),
    }
  
    useRequests(${setup.requests ?? '{}'})
    useComponents(${setup.components ?? '{}'})
  
    return (${result.code})
  }
})

${
  id != null
    ? `
if (import.meta.hot) {
  _sfc_main.__hmrId = '${id}'
  __VUE_HMR_RUNTIME__.createRecord(_sfc_main.__hmrId, _sfc_main)
  import.meta.hot.accept(({ default: updated, _rerender_only }) => {
    // if (_rerender_only) {
    //   __VUE_HMR_RUNTIME__.rerender(updated.__hmrId, updated.render)
    // } else {
      __VUE_HMR_RUNTIME__.reload(updated.__hmrId, updated)
    // }
  })
}
`
    : ``
}

export default _sfc_main
`.trimStart();
}
