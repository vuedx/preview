import Path from 'path';
import { generatePreviewComponent } from '../src/transform';

describe('transform()', () => {
  function abs(fileName: string): string {
    return Path.normalize(Path.resolve(__dirname, fileName));
  }
  it('should get <preview> block as module factory', () => {
    expect(generatePreviewComponent(abs('fixture/Example.vue'), 'example preview block'))
      .toMatchInlineSnapshot(`
      "\\"use strict\\";

      Object.defineProperty(exports, \\"__esModule\\", {
        value: true
      });
      exports.render = render;
      exports.default = void 0;

      var _vue = require(\\"vue\\");

      var _previewProvider = require(\\"@vuedx/preview-provider\\");

      var _Example = _interopRequireDefault(require(\\"${abs('fixture/Example.vue')}\\"));

      function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

      (0, _previewProvider.installFetchInterceptor)();

      function render(_ctx, _cache) {
        const _component_Example = (0, _vue.resolveComponent)(\\"Example\\");

        return (0, _vue.openBlock)(), (0, _vue.createBlock)(_component_Example);
      }

      var _default = (overrides = {}) => (0, _vue.defineComponent)({
        name: 'Preview',
        components: {
          \\"Example\\": _Example.default
        },

        setup() {
          const preview = { ..._previewProvider.provider,
            attrs: {},
            state: (0, _vue.reactive)(overrides.state != null ? overrides.state : {
              foo: 1
            }),
            x: (0, _vue.inject)('preview:UserProviders', null)
          };
          (0, _previewProvider.useRequests)({ ...{},
            ...overrides.requests
          });
          (0, _previewProvider.useComponents)({ ...{},
            ...overrides.components
          });
          return {
            preview,
            p: preview
          };
        },

        created() {
          this.$p = this.preview;
        },

        render
      });

      exports.default = _default;"
    `);
  });
});
