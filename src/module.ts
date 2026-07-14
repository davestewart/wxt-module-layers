import { basename, join, relative } from 'node:path'
import { existsSync } from 'node:fs'
import { globSync } from 'glob'
import { makeLogger, plural } from '@davestewart/wxt-utils'
import pc from 'picocolors'
import 'wxt'
import type { EntrypointInfo, WxtResolvedUnimportOptions } from 'wxt'
import { defineWxtModule } from 'wxt/modules'
import {
  getLayerPaths,
  loadLayerConfig,
  resolveEntrypoints,
  resolveLayerAutoImportDirs,
  resolveSources,
  scanLayerEntrypoints,
} from './filesystem'
import { LayerOptions, LayersModuleOptions, SourceOptions } from './types'

// ---------------------------------------------------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Augment WXT
 */
declare module 'wxt' {
  interface InlineConfig {
    layers?: LayersModuleOptions;
  }

  interface WxtHooks {
    /**
     * Called after layers have been resolved
     */
    'layers:resolved': (layerPaths: string[]) => void
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// functions
// ---------------------------------------------------------------------------------------------------------------------

/**
 * Define a layer configuration
 */
export function defineLayer (config: LayerOptions): LayerOptions {
  return config
}

/**
 * Layers module
 */
export const module = defineWxtModule({
  name: 'wxt-module-layers',

  configKey: 'layers',

  async setup (wxt, options: LayersModuleOptions = {}) {
    // -----------------------------------------------------------------------------------------------------------------
    // setup
    // -----------------------------------------------------------------------------------------------------------------

    // logger
    const Logger = makeLogger(wxt.logger, 'layers', options.logLevel ?? 'info')

    // helpers
    function interpolateLayerName (template: string, layerName: string): string {
      return template.replace(/\{name}/g, layerName)
    }

    /**
     * Merge layer options from layer config, source config, and module options
     * Priority: layer > source > module (with defaults)
     */
    function mergeLayerOptions (
      layerConfig: LayerOptions | null,
      sourceConfig: SourceOptions,
      moduleOptions: LayersModuleOptions,
    ): LayerOptions {
      return {
        layerAlias: layerConfig?.layerAlias ??
          sourceConfig?.layerAlias ??
          moduleOptions.layerAlias ??
          '#{name}',
        publicPrefix: layerConfig?.publicPrefix ??
          sourceConfig?.publicPrefix ??
          moduleOptions.publicPrefix ??
          '{name}',
        publicAccess: layerConfig?.publicAccess ??
          sourceConfig?.publicAccess ??
          moduleOptions.publicAccess ??
          false,
        autoImports: layerConfig?.autoImports ??
          sourceConfig?.autoImports ??
          moduleOptions.autoImports ??
          [],
        entrypoints: layerConfig?.entrypoints ??
          sourceConfig?.entrypoints ??
          moduleOptions.entrypoints ??
          undefined,
        order: layerConfig?.order ?? 50,
        manifest: layerConfig?.manifest,
      }
    }

    /**
     * Set an alias for a path
     * @param path    The absolute path to the layer or layers folder
     * @param alias   Specific alias config (false to skip, true to use default, string to use custom)
     * @param type
     */
    function setAlias (path: string, alias?: string | undefined, type: 'source' | 'layer' = 'layer') {
      if (!alias) {
        return
      }

      // variable
      const key = interpolateLayerName(alias, basename(path))
      const indent = type === 'source' ? '  ' : '    '
      const prefix = `${indent}- alias: `
      wxt.config.alias ??= {}
      if (wxt.config.alias[key]) {
        Logger.debug(`${prefix}${pc.redBright(key)} is already defined! (skipping)`)
        return
      }
      wxt.config.alias[key] = path

      // debug
      Logger.debug(`${prefix}${pc.yellow(key)}`)
    }

    // variables
    const rootDir = wxt.config.root
    const srcDir = wxt.config.srcDir

    // -----------------------------------------------------------------------------------------------------------------
    // scan for layers
    // -----------------------------------------------------------------------------------------------------------------

    // layer sources
    const layerSources: SourceOptions[] = resolveSources(rootDir, options.sources)
    if (layerSources.length === 0) {
      Logger.warn(pc.redBright('No layer sources defined!'))
      return
    }

    // -----------------------------------------------------------------------------------------------------------------
    // process all layers
    // -----------------------------------------------------------------------------------------------------------------

    interface LayerEntrypointInfo {
      order: number,
      layerName: string,
      entrypointName: string,
      info: EntrypointInfo,
    }

    // variables
    const allLayerPaths: string[] = []
    const allAutoImportPaths: string[] = []
    const allEntrypoints: LayerEntrypointInfo[] = []

    // 2D loop: iterate over sources, then layers within each source
    for (const source of layerSources) {
      // log source
      const sourceRelPath = relative(rootDir, source.source)
      Logger.debug((`[source]: ${sourceRelPath}`))

      // source alias
      if (source?.sourceAlias && source?.sourceAlias) {
        setAlias(source.source.replace('/*', ''), source.sourceAlias, 'source')
      }

      const layerPaths = getLayerPaths(source)

      for (const layerPath of layerPaths) {
        // collect layer path for hook
        allLayerPaths.push(layerPath)

        // merge options at the top of the loop: module > source > layer
        const layerConfig = await loadLayerConfig(layerPath)
        const layerOptions = mergeLayerOptions(layerConfig, source, options)

        // variables
        const layerName = basename(layerPath)
        const layerRelPath = relative(rootDir, layerPath)

        Logger.debug((`  [layer]: ${layerRelPath}`))

        // ---------------------------------------------------------------------------------------------------------------
        // layer alias (added immediately)
        // ---------------------------------------------------------------------------------------------------------------

        setAlias(layerPath, layerOptions.layerAlias)

        // ---------------------------------------------------------------------------------------------------------------
        // entrypoints (added on hook)
        // ---------------------------------------------------------------------------------------------------------------

        // get entrypoints
        const layerEntrypoints = layerOptions.entrypoints
          ? resolveEntrypoints(layerOptions.entrypoints, layerPath)
          : scanLayerEntrypoints(layerPath)

        // process entrypoints
        for (const entrypoint of layerEntrypoints) {
          // debug
          const path = relative(layerPath, entrypoint.inputPath)
          const suffix = entrypoint.type === 'background'
            ? pc.dim('(layer-background)')
            : pc.dim(`(${entrypoint.type})`)
          Logger.debug(`    - entrypoint: ${path} ${suffix}`)

          // collect entrypoint
          allEntrypoints.push({
            layerName,
            entrypointName: entrypoint.name,
            order: layerOptions.order ?? 100,
            info: entrypoint,
          })
        }

        // ---------------------------------------------------------------------------------------------------------------
        // auto-imports (collated for later addition on hook)
        // ---------------------------------------------------------------------------------------------------------------

        // collect auto-import directories
        const autoImportPaths = resolveLayerAutoImportDirs(layerPath, layerOptions.autoImports ?? [])
        if (autoImportPaths.length > 0) {
          Logger.debug(`    - auto-imports: ${autoImportPaths.map(d => `${basename(d)}`).join(', ')}`)
          allAutoImportPaths.push(...autoImportPaths)
        }

        // ---------------------------------------------------------------------------------------------------------------
        // public folder (copied on hook)
        // ---------------------------------------------------------------------------------------------------------------

        // use pre-resolved public prefix
        const publicPrefix = interpolateLayerName(layerOptions.publicPrefix ?? '', layerName)

        // path to public folder
        const publicPath = join(layerPath, 'public')

        // handle public files
        if (existsSync(publicPath)) {
          // debug
          Logger.debug(`    - public: ${publicPrefix}/*`)

          // glob once at setup time, so the list is available to both hooks below
          const publicFiles = globSync('**/*', {
            cwd: publicPath,
            nodir: true,
          })

          // register paths so they appear in `.wxt/types/paths.d.ts`
          wxt.hook('prepare:publicPaths', (_, paths) => {
            for (const file of publicFiles) {
              paths.push(join(publicPrefix, file))
            }
          })

          // copy public files at build time
          wxt.hook('build:publicAssets', (_, assets) => {
            for (const file of publicFiles) {
              const absoluteSrc = join(publicPath, file)
              const relativeDest = join(publicPrefix, file)
              assets.push({ absoluteSrc, relativeDest })
            }
          })

          // add public files to web accessible resources
          if (layerOptions.publicAccess) {
            const matches = layerOptions.publicAccess === true
              ? ['<all_urls>']
              : ([] as string[]).concat(layerOptions.publicAccess)
            const resources = publicFiles.map(file => '/' + join(publicPrefix, file))
            Logger.debug(`    - web accessible: ${matches.join(', ')}`)
            wxt.hook('build:manifestGenerated', (_wxt, manifest) => {
              manifest.web_accessible_resources ??= []
              const target = manifest.web_accessible_resources?.find(entry => {
                return typeof entry !== 'string' && String(entry.matches?.sort()) === String(matches.sort())
              })
              if (target && typeof target !== 'string') {
                for (const resource of resources) {
                  if (!target.resources.includes(resource)) {
                    target.resources.push(resource)
                  }
                }
              }
              else {
                // @ts-ignore
                manifest.web_accessible_resources.push({ matches, resources })
              }
            })
          }
        }

        // ---------------------------------------------------------------------------------------------------------------
        // update manifest properties (on hook)
        // ---------------------------------------------------------------------------------------------------------------

        if (layerOptions.manifest) {
          wxt.hook('build:manifestGenerated', (wxt, manifest) => {
            if (layerOptions.manifest) {
              layerOptions.manifest(wxt, manifest)
            }
          })
        }
      }
    }

    // exit if no layers found
    if (allLayerPaths.length === 0) {
      Logger.warn(pc.redBright('No layers found!'))
      return
    }

    wxt.hook('ready', () => {
      wxt.hooks.callHook('layers:resolved', allLayerPaths)
    })

    // -----------------------------------------------------------------------------------------------------------------
    // virtual module for layer backgrounds
    // -----------------------------------------------------------------------------------------------------------------

    const MODULE_NAME = 'wxt-module-layers:background'
    const MODULE_ID = '\0' + MODULE_NAME

    // let TS / ESLint know the virtual module exists in consumer projects
    wxt.hook('prepare:types', (_, entries) => {
      entries.push({
        path: 'types/wxt-module-layers.d.ts',
        text: [
          `declare module '${MODULE_NAME}' {`,
          `  /** Runs all layer background handlers in registration order. */`,
          `  export function main(): boolean`,
          `  const layerBackgrounds: { main(): boolean }`,
          `  export default layerBackgrounds`,
          `}`,
          '',
        ].join('\n'),
        tsReference: true,
      })
    })

    /**
     * Create a Vite plugin that provides a virtual module to load layer backgrounds
     *
     * @param entrypoints   Unordered entrypoint infos for the layer backgrounds
     * @param debug         An optional debug flag to enable timing logs
     */
    function createLayerBackgroundsPlugin (entrypoints: LayerEntrypointInfo[], debug = process.env.NODE_ENV === 'development') {
      return {
        name: 'wxt-module-layers-backgrounds',

        resolveId (id: string) {
          if (id === MODULE_NAME) {
            return MODULE_ID
          }
        },

        load (id: string) {
          if (id === MODULE_ID) {
            // variables
            let imports = ''
            let handlers = ''

            // prepare imports and handler calls
            for (const entrypoint of entrypoints) {
              const label = entrypoint.layerName.replace(/\W+/g, '_')
              const handler = `init_${label}`
              imports += `import ${handler} from '${entrypoint.info.inputPath}';\n`
              handlers += `${label}: ${handler}.main ?? ${handler},`
            }

            // final code
            return `
              ${imports}
              
              // variables
              const PROFILE = ${debug};
              const microtime = () => performance.now();
              const start = microtime();
              const style = 'color: var(--ref-palette-primary60); padding: 2px 0px; border-radius: 4px;';
              
              // helpers
              function trace(text, time = start) {
                const ms = Math.floor((microtime() - time) * 1000) / 1000;
                console.log('%c' + text + ': ' + ms.toFixed(3) + 'ms', style);
              }
              
              async function runAll () {
                const handlers = {
                  ${handlers}
                };
                let prevResult;
                PROFILE && console.group('[wxt-layers]');
                for (const name in handlers) {
                  const handler = handlers[name];
                  const interval = microtime();
                  PROFILE && console.group(name + '.background:');
                  const result = handler(prevResult);
                  if (result instanceof Promise) {
                    prevResult = await result;
                  }
                  else {
                    prevResult = result;
                  }
                  PROFILE && trace('Took', interval);
                  PROFILE && console.groupEnd();
                }
                trace('Total');
                PROFILE && console.groupEnd();
              }
              
              export function main () {
                void runAll();
                return true;
              }
              
              export default { main };
            `
          }
        },

        async handleHotUpdate ({ server, module }: { server: any; module: any }) {
          if (module.id === MODULE_ID) {
            const module = server.moduleGraph.getModuleById(MODULE_ID)
            server.moduleGraph.invalidateModule(module)
            server.ws.send({ type: 'full-reload' })
          }
        },
      }
    }

    // -----------------------------------------------------------------------------------------------------------------
    // modify config once resolved (entrypoints, auto-imports)
    // -----------------------------------------------------------------------------------------------------------------

    wxt.hook('entrypoints:found', (_, entrypointInfos) => {
      // layer backgrounds
      const layerBackgrounds: LayerEntrypointInfo[] = []

      // add entrypoints (but not layer backgrounds!)
      for (const entrypoint of allEntrypoints) {
        const { info } = entrypoint
        if (info.type === 'background') {
          layerBackgrounds.push(entrypoint)
        }
        else {
          entrypointInfos.push(info)
        }
      }

      // handle layer backgrounds
      if (layerBackgrounds.length > 0) {
        const entrypoints = layerBackgrounds.sort((a, b) => a.order - b.order)

        // always register the virtual module plugin so the import resolves in both modes
        wxt.hook('vite:devServer:extendConfig', (config: any) => {
          config.plugins = config.plugins || []
          config.plugins.push(createLayerBackgroundsPlugin(entrypoints))
        })

        wxt.hook('vite:build:extendConfig', (_entrypoints: any, config: any) => {
          config.plugins = config.plugins || []
          config.plugins.push(createLayerBackgroundsPlugin(entrypoints))
        })

        const existingBackground = entrypointInfos.find(e => e.type === 'background')
        if (existingBackground) {
          // manual mode: user imports 'wxt-module-layers:background' themselves
          Logger.info(pc.yellowBright(`Main background found — use '${MODULE_NAME}' to initialize ${plural('layer background', layerBackgrounds)}:`))
          layerBackgrounds.forEach(info => {
            Logger.info(pc.yellow(`     - ${relative(wxt.config.root, info.info.inputPath)}`))
          })
        }
        else {
          // auto mode: create virtual entrypoint that runs all layer backgrounds
          Logger.info(pc.yellowBright(`Created virtual entrypoint for ${plural('layer background', layerBackgrounds)}`))
          entrypointInfos.push({
            name: 'background',
            inputPath: MODULE_NAME,
            type: 'background',
          })
        }
      }
    })

    wxt.hook('config:resolved', async () => {
      // ---------------------------------------------------------------------------------------------------------------
      // add layer auto-imports
      // ---------------------------------------------------------------------------------------------------------------

      if (allAutoImportPaths.length > 0) {
        if (wxt.config.imports.disabled) {
          Logger.warn('Auto-imports are disabled, layer auto-imports will not work')
          return
        }

        // ensure imports config exists
        if (!wxt.config.imports) {
          wxt.config.imports = {} as WxtResolvedUnimportOptions
        }

        // add layer directories to auto-imports
        wxt.config.imports.dirs ||= []

        for (const importPath of allAutoImportPaths) {
          if (!wxt.config.imports.dirs.includes(importPath)) {
            const relPath = relative(srcDir, importPath)
            wxt.config.imports.dirs.push(relPath)
          }
        }
      }
    })
  },
})
