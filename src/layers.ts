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
export interface LayerWxtOptions {
  /**
   * Whether to register layer alias (default: false, layer is not aliased)
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * @usage
   *
   * Layer will be aliased as:
   *
   * ```ts
   * false        // no alias
   * true         // '#<layer-name>'
   * '@{name}'    // '@<layer-name>'
   * '@my-layer'  // '@my-layer'
   * 'my-layer'   // 'my-layer'
   * ```
   */
  layerAlias?: string | boolean

  /**
   * Automatically register layer's auto-import folders (default: false)
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * Default auto-import folders are:
   *
   * - `<layer>/components/*`
   * - `<layer>/composables/*`
   * - `<layer>/hooks/*`
   * - `<layer>/stores/*`
   * - `<layer>/utils/*`
   *
   * @usage
   *
   * Auto-import folders to register:
   *
   * ```ts
   * false                  // no folders
   * true                   // default folders
   * ['utils']              // only 'utils' folder
   * ['utils', 'classes']   // 'utils' and 'classes' folders
   * ```
   *
   * Use `autoImportDirs` in `LayerConfig` to add additional directories.
   */
  autoImports?: boolean | string[]

  /**
   * Manually specify entrypoints for the layer
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * @usage
   *
   * Entrypoints to build for the layer:
   *
   * ```ts
   * ['background.ts']                      // single entrypoint
   * ['background.ts', 'popup.ts']          // multiple entrypoints
   * ['foo.content.ts', 'bar.content.ts']   // multiple content scripts
   * ```
   */
  entrypoints?: string[]

  /**
   * Public path prefix for layer public assets, e.g. (default: '{name}')
   *
   * > _When these values are used in the module options, they set the defaults for all layers_
   *
   * @usage
   *
   * Image file 'image.jpg' in layer 'my-layer' will be copied to:
   *
   * ```ts
   * ''               // '/image.jpg' (root)
   * '{name}'         // '/my-layer/image.jpg' (subfolder)
   * 'layers/{name}'  // '/layers/my-layer/image.jpg' (nested subfolder)
   * 'layers'         // '/layers/image.jpg' (all layers use the same folder)
   * ```
   */
  publicPrefix?: string
}

/**
 * Layer options
 *
 */
export interface LayerConfig extends LayerWxtOptions {
  /**
   * The order in which the layer is loaded (default: 50)
   */
  order?: number

  /**
   * Manually specify entrypoints for the layer
   */
  entrypoints?: string[]

  /**
   * Manifest properties to merge into the extension's manifest.json
   */
  manifest?: Partial<{
    permissions: string[]
    host_permissions: string[]
    optional_permissions: string[]
    content_security_policy: any
    web_accessible_resources: any[]
    [key: string]: any
  }>
}

/**
 * Define a layer configuration
 */
export function defineLayer (config: LayerConfig): LayerConfig {
  return config
}
