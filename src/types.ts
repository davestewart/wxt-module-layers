import type { LogLevel } from '@davestewart/wxt-utils'
import type { HookResult, Wxt } from 'wxt'
import type { Browser } from 'wxt/browser'

/**
 * Names of supported extension entrypoints
 *
 * > **Note**: entrypoint naming format is swapped from WXT defaults;
 * > e.g. `content.<name>` instead of `<name>.content`
 */
type EntrypointName =
  // script will be inserted into the service worker
  | 'background'

  // one or more of (pass <type> or <type>.<name>)
  | 'content'
  | `content.${string}`
  | 'sandbox'
  | `sandbox.${string}`
  | 'sidepanel'
  | `sidepanel.${string}`
  | 'unlisted'
  | `unlisted.${string}`

  // one of
  | 'bookmarks'
  | 'devtools'
  | 'history'
  | 'newtab'
  | 'options'
  | 'popup'

/**
 * Mapping of entrypoint names to their source paths
 */
export type LayerEntrypoints = Partial<Record<EntrypointName, string>>

/**
 * Options which configure how layers are built and added to the extension
 *
 * > These base options can be added to module and layer config
 * >
 * > - in module config, they set the defaults for all layers
 * > - in layer config, they override the module defaults for that layer
 *
 * Layers are private by default (but can be configured):
 *
 * - no registered alias
 * - auto-imports folders are not added to global auto-imports
 * - public assets are placed under '/<layer-name>/'
 */
export interface LayersCommonOptions {
  /**
   * Whether to register layer alias (default: `true`, aliased as `#<layer-name>`)
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * @usage
   *
   * Module and layer options:
   *
   * ```ts
   * false        // no alias(es)
   * true         // '#<layer-name>', named after layer with '#' prefix
   * '@{name}'    // '@<layer-name>', named after layer with '@' prefix
   * ```
   * Layer-only options:
   *
   * ```ts
   * '@my-layer'  // '@my-layer', custom name with '@' prefix
   * 'my-layer'   // 'my-layer', custom name
   * ```
   */
  layerAlias?: string | boolean

  /**
   * Automatically register layer's auto-import folders (default: `false`, no auto-imports)
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * Default auto-import folders are:
   *
   * ```
   * <layer>/components/*
   * <layer>/composables/*
   * <layer>/hooks/*
   * <layer>/stores/*
   * <layer>/utils/*
   * ```
   *
   * @usage
   *
   * Auto-import folders to register:
   *
   * ```ts
   * false                  // no folders
   * true                   // default folders
   * ['composables']        // only 'composables' folder
   * ['utils', 'classes']   // 'utils' and 'classes' folders
   * ```
   *
   * Use `autoImportDirs` in `LayerConfig` to add additional directories.
   */
  autoImports?: boolean | string[]

  /**
   * Manually specify entrypoints for the layer (default: none, uses folder scanning)
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * @usage
   *
   * Entrypoints to build for the layer:
   *
   * ```ts
   * {
   *   'background':        'background/main.ts',
   *   'popup':             'popup/popup.html',
   *   'content':           'content/page.ts',
   *   'content.linked-in': 'content/linkedin.ts',
   *   'unlisted.test':     'tests/test.ts',
   * }
   * ```
   *
   * Note that content and unlisted entrypoints must be named uniquely, so may
   * use `<type>.<name>` format to register multiple entrypoints of the same type.
   */
  entrypoints?: LayerEntrypoints

  /**
   * Public path prefix for layer public assets, e.g. (default: `{name}`)
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * @usage
   *
   * Image file 'image.jpg' in layer '<layer-name>' will be copied to:
   *
   * ```ts
   * ''               // '/image.jpg' (root)
   * '{name}'         // '/<layer-name>/image.jpg' (subfolder)
   * 'layers/{name}'  // '/layers/<layer-name>/image.jpg' (nested subfolder)
   * 'layers'         // '/layers/image.jpg' (all layers use the same folder)
   * ```
   */
  publicPrefix?: string
}

/**
 * Options for the Layers module
 */
export interface LayersModuleOptions extends LayersCommonOptions {
  /**
   * List of layer sources (default: '/layers/*')
   *
   * Paths must be relative to the project root or absolute path
   *
   * @usage
   *
   * ```ts
   * [
   *   'layers/*',        // all folders under '<root>/layers/'
   *   'src/packages/*',  // all folders under '<root>/src/packages/'
   *   'modules/foo',     // single layer 'foo' under '<root>/modules/'
   * ]
   * ```
   */
  sources?: string[]

  /**
   * Log level for the module logger (default: 'info')
   */
  logLevel?: LogLevel
}

/**
 * Options for a specific layer
 *
 */
export interface LayerConfig extends LayersCommonOptions {
  /**
   * The order in which the layer is loaded (default: 50; lower numbers load first)
   */
  order?: number

  /**
   * Callback to modify the extension manifest
   */
  manifest?: (wxt: Wxt, manifest: Browser.runtime.Manifest) => HookResult;
}
