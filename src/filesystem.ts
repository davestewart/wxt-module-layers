import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'
import { type EntrypointInfo } from 'wxt'
import { loadConfig } from 'c12'
import { LayerConfig } from './layers'
import { toArray } from './utils'

/**
 * Resolve all layers from given sources (rel, abs and child/* paths)
 */
export function resolveLayers (layersSources: string | string[]): string[] {
  // output array
  const resolvedLayers: string[] = []

  // expand paths
  for (const source of toArray(layersSources)) {
    const absSource = resolve(source)

    // wildcard
    if (absSource.endsWith('/*')) {
      const absDir = absSource.slice(0, -2)
      if (existsSync(absDir)) {
        const absLayers = readdirSync(absDir)
          .map(name => join(absDir, name))
          .filter(absPath => statSync(absPath).isDirectory())
        resolvedLayers.push(...absLayers)
      }
    }

    // normal layer
    else if (existsSync(absSource)) {
      resolvedLayers.push(absSource)
    }
  }

  // return
  return resolvedLayers
}

/**
 * Load layer config file if it exists
 */
export async function loadLayerConfig (layerPath: string): Promise<LayerConfig | null> { // | typeof defineLayer
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

  const entrypoints: string[] = []

  // scan for all potential entrypoint files/directories
  const entries = readdirSync(entrypointsDir)
  for (const entry of entries) {
    const fullPath = join(entrypointsDir, entry)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      const entries = readdirSync(fullPath)
      const rx = /^(index)\.(ts|tsx|js|jsx|html|css|scss|sass|less)$/
      const indexFile = entries.find(entry => rx.test(entry))
      if (indexFile) {
        entrypoints.push(join(fullPath, indexFile))
      }
    }
    else {
      entrypoints.push(fullPath)
    }
  }

  // return final mapped entrypoint infos
  return resolveEntrypoints(entrypoints)
}

/**
 * Resolve entrypoints from given paths
 *
 * @param layerPath
 * @param paths
 */
export function resolveEntrypoints (paths: string[], layerPath?: string): EntrypointInfo[] {
  return paths
    .map(path => layerPath ? resolve(layerPath, path) : path)
    .filter(path => existsSync(path))
    .map(path => {
      const name = basename(path, extname(path))
      const type = determineEntrypointType(name, extname(path))
      return {
        name,
        inputPath: path,
        type,
      }
    })
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
export function getLayerAutoImportDirs (layerPath: string, dirs: string[] = []): string[] {
  const existingDirs: string[] = []
  for (const dir of dirs) {
    const dirPath = join(layerPath, dir)
    if (existsSync(dirPath)) {
      existingDirs.push(dirPath)
    }
  }

  return existingDirs
}
