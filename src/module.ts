import { basename, join, relative } from 'node:path'
import { existsSync } from 'node:fs'
import { globSync } from 'glob'
import { makeLogger, plural } from '@davestewart/wxt-utils'
import pc from 'picocolors'
import 'wxt'
import type { EntrypointInfo, WxtResolvedUnimportOptions } from 'wxt'
import { defineWxtModule } from 'wxt/modules'
import {
  resolveLayerAutoImportDirs,
  resolveEntrypoints,
  resolveLayers,
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

    // variables
    const rootDir = wxt.config.root
    const srcDir = wxt.config.srcDir

    /**
     * Set an alias for a path
     * @param path    The absolute path to the layer or layers folder
     * @param alias   Specific alias config (false to skip, true to use default, string to use custom)
     */
    function setAlias (path: string, alias?: string | undefined) {
      if (!alias) {
        return
      }

      // variable
      const key = interpolateLayerName(alias, basename(path))
      wxt.config.alias ??= {}
      if (wxt.config.alias[key]) {
        Logger.debug(`  - alias: ${pc.redBright(key)} is already defined! (skipping)`)
        return
      }
      wxt.config.alias[key] = path

      // debug
      Logger.debug(`  - alias: ${pc.magenta(key)}`)
    }

    // -----------------------------------------------------------------------------------------------------------------
    // scan for layers
    // -----------------------------------------------------------------------------------------------------------------

    // start scanning for layers
    Logger.debug('Resolving sources...')

    // layer sources
    const layerSources: SourceOptions[] = resolveSources(rootDir, options.sources)
    if (layerSources.length === 0) {
      Logger.warn(pc.redBright('No layer sources defined!'))
      return
    }

    // log sources
    layerSources.forEach(source => {
      // debug
      Logger.debug(`  - ${relative(rootDir, source.source)}`)

      // source alias
      if (source?.sourceAlias && source?.sourceAlias) {
        setAlias(source.source.replace('/*', ''), source.sourceAlias)
      }
    })

    // resolve all layers with cascaded options
    const resolvedLayers = await resolveLayers(layerSources, options)
    if (resolvedLayers.length === 0) {
      Logger.warn(pc.redBright('No layers found!'))
      return
    }

    // resolved
    Logger.info(`Scanning ${plural('layer folder', resolvedLayers)}...`)
    resolvedLayers.forEach(({ path }) => {
      Logger.debug(`  - ${relative(rootDir, path)}`)
    })

    // register layer paths for future modules
    wxt.hook('ready', () => {
      wxt.hooks.callHook('layers:resolved', resolvedLayers.map(l => l.path))
    })

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
    const allAutoImportPaths: string[] = []
    const allEntrypoints: LayerEntrypointInfo[] = []

    // loop over layers
    for (const { path: layerPath, options: layerOptions } of resolvedLayers) {
      // variables
      const layerName = basename(layerPath)
      const layerRelPath = relative(rootDir, layerPath)

      Logger.debug(`Processing layer: ${pc.blue(layerRelPath)}`)

      // ---------------------------------------------------------------------------------------------------------------
      // layer alias (added immediately)
      // ---------------------------------------------------------------------------------------------------------------

      setAlias(layerPath, layerOptions.layerAlias)

      // ---------------------------------------------------------------------------------------------------------------
      // entrypoints (added on hook)
      // ---------------------------------------------------------------------------------------------------------------

      // get entrypoints (already resolved in options)
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
        Logger.debug(`  - entrypoint: ${path} ${suffix}`)

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
        Logger.debug(`  - auto-imports: ${autoImportPaths.map(d => `${basename(d)}`).join(', ')}`)
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
        Logger.debug(`  - public files: ${layerName}/public`)

        // copy public files at build time
        wxt.hook('build:publicAssets', (_, assets) => {
          // find all files in public directory
          const publicFiles = globSync('**/*', {
            cwd: publicPath,
            nodir: true,
          })

          for (const file of publicFiles) {
            const absoluteSrc = join(publicPath, file)
            const relativeDest = join(publicPrefix, file)
            assets.push({ absoluteSrc, relativeDest })
          }
        })
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

    // -----------------------------------------------------------------------------------------------------------------
    // virtual module for layer backgrounds
    // -----------------------------------------------------------------------------------------------------------------

    const MODULE_NAME = 'wxt-module-layers:background'
    const MODULE_ID = '\0' + MODULE_NAME

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
            const handlers = []

            // prepare imports and handler calls
            for (const entrypoint of entrypoints) {
              const label = entrypoint.layerName.replace(/\W+/g, '_')
              const handler = `init_${label}`
              imports += `import ${handler} from '${entrypoint.info.inputPath}';\n`
              handlers.push(handler)
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
                const handlers = [${handlers.join(', ')}];
                let prevResult;
                PROFILE && console.group('[wxt-layers]');
                for (const handler of handlers) {
                  const interval = microtime();
                  const name = handler.name.substring(5);
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
              
              export default {
                main () {
                  void runAll();
                  return true;
                }
              }
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

      // check for existing background
      const existingBackground = entrypointInfos.find(e => e.type === 'background')
      if (existingBackground && layerBackgrounds.length > 0) {
        Logger.info(pc.yellowBright('⚠️ Main background entrypoint found at:'))
        Logger.info(pc.yellowBright(`     - ${relative(wxt.config.root, existingBackground.inputPath)}`))
        Logger.info(pc.yellow(`   Make sure to initialize ${plural('layer background', layerBackgrounds)} manually:`))
        layerBackgrounds.forEach(info => {
          Logger.info(pc.yellow(`     - ${relative(wxt.config.root, info.info.inputPath)}`))
        })
      }

      // if no background but layer background slices, create a virtual file to run them
      if (!existingBackground && layerBackgrounds.length > 0) {
        Logger.info(pc.yellowBright(`Created virtual entrypoint for ${plural('layer background', layerBackgrounds)}`))

        // add the virtual entrypoint
        entrypointInfos.push({
          name: 'background',
          inputPath: MODULE_NAME,
          type: 'background',
        })

        // get paths
        const entrypoints = layerBackgrounds.sort((a, b) => a.order - b.order)

        // Register the virtual module plugin
        wxt.hook('vite:devServer:extendConfig', (config: any) => {
          config.plugins = config.plugins || []
          config.plugins.push(createLayerBackgroundsPlugin(entrypoints))
        })

        wxt.hook('vite:build:extendConfig', (_entrypoints: any, config: any) => {
          config.plugins = config.plugins || []
          config.plugins.push(createLayerBackgroundsPlugin(entrypoints))
        })
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
