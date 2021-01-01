import { ComponentPublicInstance, App } from '@vue/runtime-core';
import { SetupOptions } from '@vuedx/preview-provider';
import Path from 'path';
import { getStackTraceLine } from './stacktrace';
import { execute, executeAsApp } from './vm';

/**
 * Load <preview name="..."> block as a component.
 *
 * The component SFC/.vue file is detected using the test
 * file name, e.g.:
 *   - foo.ts => foo.vue
 *   - foo.spec.ts => foo.vue
 *   - foo.test.ts => foo.vue
 *   - src/__tests__/foo.spec.ts => src/foo.vue
 * @param previewName "name" attribute of the required <preview> block
 */
export function usePreview(previewName: string): ComponentPublicInstance;

/**
 * Load <preview name="..."> block as a component.
 *
 * The component SFC/.vue file is detected using the test
 * file name, e.g.:
 *   - foo.ts => foo.vue
 *   - foo.spec.ts => foo.vue
 *   - foo.test.ts => foo.vue
 *   - src/__tests__/foo.spec.ts => src/foo.vue
 * @param previewName "name" attribute of the required <preview> block
 * @param overrides Override mocks and stubs set in <preview> block
 */
export function usePreview(
  previewName: string,
  overrides: Partial<SetupOptions>
): ComponentPublicInstance;

/**
 * Load <preview name="..."> block as a component.
 *
 * @param fileName The component SFC/.vue file.
 * @param previewName "name" attribute of the required <preview> block
 */
export function usePreview(fileName: string, previewName: string): ComponentPublicInstance;

/**
 * Load <preview name="..."> block as a component.
 *
 * @param fileName The component SFC/.vue file.
 * @param previewName "name" attribute of the required <preview> block
 * @param overrides Override mocks and stubs set in <preview> block
 */
export function usePreview(
  fileName: string,
  previewName: string,
  overrides: Partial<SetupOptions>
): ComponentPublicInstance;

export function usePreview(
  ...args:
    | [string]
    | [string, Partial<SetupOptions> | string]
    | [string, string, Partial<SetupOptions>]
): ComponentPublicInstance {
  const { fileName, previewName, overrides } = prepareArgs(args);

  return execute(fileName, previewName)(overrides);
}

/**
 * Load <preview name="..."> block as an app.
 *
 * The component SFC/.vue file is detected using the test
 * file name, e.g.:
 *   - foo.ts => foo.vue
 *   - foo.spec.ts => foo.vue
 *   - foo.test.ts => foo.vue
 *   - src/__tests__/foo.spec.ts => src/foo.vue
 * @param previewName "name" attribute of the required <preview> block
 */
export function usePreviewApp(previewName: string): App;

/**
 * Load <preview name="..."> block as an app.
 *
 * The component SFC/.vue file is detected using the test
 * file name, e.g.:
 *   - foo.ts => foo.vue
 *   - foo.spec.ts => foo.vue
 *   - foo.test.ts => foo.vue
 *   - src/__tests__/foo.spec.ts => src/foo.vue
 * @param previewName "name" attribute of the required <preview> block
 * @param overrides Override mocks and stubs set in <preview> block
 */
export function usePreviewApp(
  previewName: string,
  overrides: Partial<SetupOptions>
): App;

/**
 * Load <preview name="..."> block as an app.
 *
 * @param fileName The component SFC/.vue file.
 * @param previewName "name" attribute of the required <preview> block
 */
export function usePreviewApp(fileName: string, previewName: string): App;

/**
 * Load <preview name="..."> block as an app.
 *
 * @param fileName The component SFC/.vue file.
 * @param previewName "name" attribute of the required <preview> block
 * @param overrides Override mocks and stubs set in <preview> block
 */
export function usePreviewApp(
  fileName: string,
  previewName: string,
  overrides: Partial<SetupOptions>
): App;

export function usePreviewApp(
  ...args:
    | [string]
    | [string, Partial<SetupOptions> | string]
    | [string, string, Partial<SetupOptions>]
): App {
  const { fileName, previewName, overrides } = prepareArgs(args);

  return executeAsApp(fileName, previewName)(overrides);
}

function prepareArgs(
  args:
    | [string]
    | [string, string | Partial<SetupOptions<any>>]
    | [string, string, Partial<SetupOptions<any>>]
) {
  const fileName = getFileName(
    args.length === 3 || (args.length === 2 && typeof args[1] === 'string') ? args[0] : undefined,
    3
  );

  const previewName =
    args.length === 3
      ? args[1]
      : args.length === 2 && typeof args[1] === 'string'
      ? args[1]
      : args[0];
  const overrides =
    args.length === 3 ? args[2] : args.length === 2 && typeof args[1] !== 'string' ? args[1] : {};

  return { fileName, previewName, overrides };
}

function getFileName(fileName?: string, depth: number = 2): string {
  if (fileName != null && Path.isAbsolute(fileName)) return fileName;
  const trace = getStackTraceLine(depth);
  if (trace == null) throw new Error('CannotDetectFileName');
  if (fileName != null) return Path.resolve(Path.dirname(trace.fileName), fileName);
  const dirName = Path.dirname(trace.fileName);
  const baseName =
    Path.basename(trace.fileName).replace(/(?:\.(?:spec|test))?\.(?:js|ts)x?$/, '') + '.vue';

  const testDir = Path.sep + '__tests__' + Path.sep;
  if (dirName.includes(testDir)) {
    return Path.resolve(dirName.replace(testDir, Path.sep), baseName);
  }

  return Path.resolve(dirName, baseName);
}
