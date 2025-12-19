import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { type EntrypointInfo } from 'wxt'
import { loadConfig } from 'c12'
import { toArray } from '@davestewart/wxt-utils'
import { LayerEntrypoints, LayerOptions, SourceOptions } from './types'

export function resolveSources (rootDir: string, sources: undefined | string | Array<SourceOptions | string>): SourceOptions[] {
  return toArray(sources ?? 'layers/*')
    .map(input => typeof input === 'string' ? { source: input } : input)
    .map(input => {
      const { source, sourceAlias } = input
      const path = resolve(rootDir, source)
      return {
        ...input,
        sourceAlias: sourceAlias ?? '#{name}',
        source: path,
      }
    })
}

/**
 * Get layer paths from a source configuration
 */
export function getLayerPaths (sourceConfig: SourceOptions): string[] {
  const absSource = resolve(sourceConfig.source)
  const layerPaths: string[] = []

  // wildcard
  if (absSource.endsWith('/*')) {
    const absDir = absSource.slice(0, -2)
    if (existsSync(absDir)) {
      const absLayers = readdirSync(absDir)
        .map(name => join(absDir, name))
        .filter(absPath => statSync(absPath).isDirectory())
      layerPaths.push(...absLayers)
    }
  }
  else if (existsSync(absSource)) {
    layerPaths.push(absSource)
  }

  return layerPaths
}

/**
 * Load layer config file if it exists
 */
export async function loadLayerConfig (layerPath: string): Promise<LayerOptions | null> { // | typeof defineLayer
  try {
    const { config } = await loadConfig({
      name: 'layer-config',
      cwd: layerPath,
      configFile: 'layer.config',
    })
    return config || null
  }
  catch (error) {
    console.warn(`Failed to load config for layer ${basename(layerPath)}:`, error)
    return null
  }
}

/**
 * Scan for entrypoints in a layer directory
 */
export function scanLayerEntrypoints (layerPath: string): EntrypointInfo[] {
  const entrypointsDir = join(layerPath, 'entrypoints')

  if (!existsSync(entrypointsDir)) {
    return []
  }

  const entrypoints: EntrypointInfo[] = []

  // scan for all potential entrypoint files/directories
  const entries = readdirSync(entrypointsDir)
  for (const entry of entries) {
    // variables
    let inputPath: string = ''
    let name: string = ''

    // process
    const fullPath: string = join(entrypointsDir, entry)
    const stat = statSync(fullPath)

    // entrypoint is a directory
    if (stat.isDirectory()) {
      const entries = readdirSync(fullPath)
      const rx = /^(index)\.(ts|tsx|js|jsx|html|css|scss|sass|less)$/
      const indexFile = entries.find(entry => rx.test(entry))
      if (indexFile) {
        inputPath = join(fullPath, indexFile)
        name = entry
      }
    }

    // entrypoint is a file
    else {
      inputPath = join(entrypointsDir, entry)
      name = basename(entry, extname(entry))
    }

    // add entrypoint
    if (inputPath && name) {
      entrypoints.push({
        name,
        inputPath,
        type: determineEntrypointType(name, extname(inputPath)),
      })
    }
  }

  // return final mapped entrypoint infos
  return entrypoints
}

/**
 * Resolve entrypoints from layer entrypoints config
 *
 * @param config
 * @param layerPath
 */
export function resolveEntrypoints (config: LayerEntrypoints, layerPath: string): EntrypointInfo[] {
  // resolved entrypoints
  const entrypoints: EntrypointInfo[] = []

  // loop over config object
  for (const [key, path] of Object.entries(config)) {
    if (path) {
      const inputPath = resolve(layerPath, path)
      if (existsSync(inputPath)) {
        const [name] = key.split('.') as [string, string | undefined]
        const type = determineEntrypointType(key, extname(inputPath))
        entrypoints.push({
          inputPath,
          name,
          type,
        })
      }
    }
  }

  // return final mapped entrypoints
  return entrypoints
}

/**
 * Determine entrypoint type from name and extension
 */
function determineEntrypointType (name: string, ext: string) {
  // css entrypoints
  if (['.css', '.scss', '.sass', '.less', '.styl', '.stylus'].includes(ext)) {
    return 'unlisted-style'
  }

  // html entrypoints
  if (ext === '.html') {
    // listed HTML entrypoints
    if (name === 'popup') return 'popup'
    if (name === 'options') return 'options'
    if (name === 'newtab') return 'newtab'
    if (name === 'devtools') return 'devtools'
    if (name === 'bookmarks') return 'bookmarks'
    if (name === 'history') return 'history'
    if (name.endsWith('.sidepanel') || name === 'sidepanel') return 'sidepanel'
    if (name.endsWith('.sandbox') || name === 'sandbox') return 'sandbox'

    return 'unlisted-page'
  }

  // script entrypoints
  if (name === 'background') return 'background'
  if (name.endsWith('.content') || name === 'content') return 'content-script'

  return 'unlisted-script'
}

/**
 * Get auto-import directories from a layer
 */
export function resolveLayerAutoImportDirs (layerPath: string, dirs: string[] = []): string[] {
  const existingDirs: string[] = []
  for (const dir of dirs) {
    const dirPath = join(layerPath, dir)
    if (existsSync(dirPath)) {
      existingDirs.push(dirPath)
    }
  }

  return existingDirs
}
