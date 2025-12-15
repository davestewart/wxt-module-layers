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
  // virtual background layer
  | 'background'

  // one of
  | 'bookmarks'
  | 'devtools'
  | 'history'
  | 'newtab'
  | 'options'
  | 'popup'

  // one or more of (pass <type> or <name>.<type>)
  | 'content'
  | `${string}.content`
  | 'sandbox'
  | `${string}.sandbox`
  | 'sidepanel'
  | `${string}.sidepanel`

  // string pattern to allow unlisted page, script or style names
  | `${string}`
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
   * Whether to register layer alias (default: `#{name}`, aliased as `#<layer-name>`)
   *
   * > _This option configurable at module, source and layer level_
   *
   * @usage
   *
   * Module and layer options:
   *
   * ```ts
   * '@{name}'    // '@<layer-name>', named after layer with '@' prefix
   * ''           // empty string, no alias(es)
   * ```
   * Layer-only options:
   *
   * ```ts
   * '@my-layer'  // '@my-layer', custom name with '@' prefix
   * 'my-layer'   // 'my-layer', custom name
   * ''           // empty string, no alias
   * ```
   */
  layerAlias?: string

  /**
   * Automatically register layer's auto-import folders (default: undefined, no auto-imports)
   *
   * > _This option configurable at module, source and layer level_
   *
   * Default auto-import folders are:
   *
   * ```
   * <layer>/components/*
   * <layer>/composables/*
   * <layer>/hooks/*
   * <layer>/utils/*
   * ```
   *
   * @usage
   *
   * Auto-import folders to register:
   *
   * ```ts
   * []                     // no folders (default)
   * ['composables']        // only 'composables' folder
   * ['utils', 'services']  // 'utils' and 'services' folders
   * ```
   *
   * This is configured per-module, per-source and per-layer
   */
  autoImports?: string[]

  /**
   * Manually specify entrypoints for the layer (default: undefined, uses folder scanning)
   *
   * > _This option configurable at module, source and layer level_
   *
   * @usage
   *
   * Entrypoints to build for the layer:
   *
   * ```ts
   * {
   *   'background':        'background/main.ts',   // background.ts
   *   'popup':             'popup/popup.html',     // popup.html
   *   'content':           'content/page.ts',      // content-scripts/content.ts
   *   'linkedin.content':  'content/linkedin.ts',  // content-scripts/linkedin.ts
   *   'test':              'tests/test.ts',        // test/test.ts
   * }
   * ```
   *
   * Note that custom-named entrypoints MUST be named uniquely
   * so use the format `<name>.<type>` to avoid name clashes.
   */
  entrypoints?: LayerEntrypoints

  /**
   * Public path prefix for layer public assets, e.g. (default: `{name}`, i.e. '/<layer-name>/')
   *
   * > _This option configurable at module, source and layer level_
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
   * List of layer source path globs (default: '/layers/*')
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
   *   { source: 'features/*', ... }, // with options
   * ]
   * ```
   */
  sources?: Array<string | SourceOptions>

  /**
   * Whether to register source alias (default: `#{name}`, i.e. `#<source-name>`)
   *
   * @usage
   *
   * ```ts
   * '@{name}'    // '@<source-name>', named after source with '@' prefix
   * ''           // empty string, no alias(es)
   * ```
   */
  sourceAlias?: string

  /**
   * Log level for the module logger (default: 'info', set to `debug` for full logging)
   */
  logLevel?: LogLevel
}

/**
 * Options for a specific layer
 *
 */
export interface LayerOptions extends LayersCommonOptions {
  /**
   * The order in which the layer is loaded (default: 50; lower numbers load first)
   */
  order?: number

  /**
   * Callback to modify the extension manifest
   */
  manifest?: (wxt: Wxt, manifest: Browser.runtime.Manifest) => HookResult;
}

/**
 * Options for one or more layers
 */
export interface SourceOptions extends LayersCommonOptions {
  /**
   * The source path glob, i.e. `src/layers/*`
   *
   * Path must be relative to the project root or absolute path
   */
  source: string

  /**
   * Whether to register layer alias (default: `#{source}`)
   */
  sourceAlias?: string
}
