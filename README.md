# WXT Layers

> Nuxt-like layers functionality for WXT browser extensions

## Abstract

**WXT Layers** brings Nuxt's [layers architecture](https://nuxt.com/docs/getting-started/layers) to browser extensions, enabling you to organize your extension into isolated, reusable modules.

Layers are self-contained folders that mirror WXT's project structure. Each layer can have its own entry points, auto-imports, assets, and manifest modifications - just like a mini-extension.

Why use layers?

- **Feature isolation**: Keep related code together (e.g., `layers/analytics/`, `layers/auth/`)
- **Cleaner organization**: Use core WXT structure for shared code, layers for specific features

How layers combine:

- **Entrypoints** from all layers are registered alongside your src entrypoints
- **Auto-imports** from layer folders can be added to the global import pool
- **Public assets** are copied with organized paths (e.g., `/analytics/icon.png`)
- **Aliases** let you reference layers easily (`#analytics`, `#auth`)
- **Manifest** can be modified at build time from individual layers

## Setup

### Installation

```bash
npm install wxt-module-layers
```

### Basic Configuration

Add the module to your `wxt.config.ts`:

```ts
import { defineConfig } from 'wxt'

export default defineConfig({
  modules: ['wxt-module-layers'],
})
```

### Create Your First Layer

Layers use the same structure as WXT:

```ruby
layers/
  analytics/
    entrypoints/
      content.ts        # Same as WXT: auto-discovered
    composables/
      useTracking.ts    # Auto-imported globally
    public/
      icons/
        tracker.png     # Copied to /analytics/icons/tracker.png
```

**That's it!** The module will:

- ✅ Create an alias `#analytics` → `layers/analytics`
- ✅ Register the content script as an entrypoint
- ✅ Make `useTracking()` available everywhere via auto-import
- ✅ Copy public files to `/analytics/` in the build output

## Layer Structure

Each layer mirrors WXT's project structure:

```yaml
layers/my-layer/
  entrypoints/          # Same as WXT
    background.ts
    popup.html
    content.ts
  composables/          # Auto-imported (if enabled)
  components/           # Auto-imported (if enabled)
  hooks/                # Auto-imported (if enabled)
  services/             # Auto-imported (if enabled)
  stores/               # Auto-imported (if enabled)
  utils/                # Auto-imported (if enabled)
  public/               # Copied to /<layer-name>/ in build
  layer.config.ts       # Optional layer configuration
  index.ts              # Optional exports
```

**Entrypoint discovery** works exactly like WXT:

- `entrypoints/popup.html` or `entrypoints/popup/index.html`
- `entrypoints/background.ts`
- `entrypoints/content.ts` or `entrypoints/content/index.ts`
- Named entrypoints: `entrypoints/content.twitter.ts`

All defaults are configurable:

- globally, see [Module Options](#module-options)
- locally, see [Layer Options](#layer-options)

## Common Use Cases

### Core Extension Logic

Use WXT's base structure for shared functionality:

```yaml
entrypoints/          # Main extension entrypoints
  popup.html
  background.ts
composables/          # Shared composables
  useStorage.ts
  useSettings.ts
utils/                # Shared utilities
  logger.ts
  api.ts
public/               # Shared assets
  icon.png
```

### Feature Layers

Isolate specific features in their own layers:

```yaml
layers/
  analytics/
    entrypoints/
      content.ts      # Track page views
    services/
      tracker.ts
    public/
      icons/
  auth/
    entrypoints/
      background.ts   # Handle auth state
      popup.html      # Login UI
    composables/
      useAuth.ts
  theme-switcher/
    entrypoints/
      content.ts
    composables/
      useTheme.ts
```

Import between layers using aliases:

```ts
// layers/analytics/services/tracker.ts
import { useAuth } from '#auth'  // Access auth layer
```

### Package Layers

Create reusable layers for common functionality across projects:

```yaml
layers/
  error-reporting/    # Reusable Sentry integration
  feature-flags/      # Reusable feature flag system
  telemetry/          # Reusable analytics
```

## Import Strategies

Different ways to import code in your extension:

### Auto-imports (Global)

No import needed - available everywhere:

```ts
// layers/analytics/composables/useTracking.ts
export function useTracking () { /* ... */ }

// Anywhere:
const track = useTracking()  // Just works
```

**Best for**: Composables, hooks, utilities used frequently across the extension.

### Source Imports (`~/`)

Import from your main `src/` directory:

```ts
import { logger } from '~/utils/logger'
import type { User } from '~/types'
```

**Best for**: Core utilities, types, and shared code in your base WXT structure.

### Layer Local (`../`)

Import from the same layer:

```ts
// Within layers/analytics/
import { TrackerService } from '../services/tracker'
import type { Event } from '../types'
```

**Best for**: Internal layer code that shouldn't be exposed outside.

### Layer Global (`#<layer>`)

Import from other layers:

```ts
import { AuthService } from '#auth'
import { trackEvent } from '#analytics'
```

**Best for**: Cross-layer dependencies, services, and types.

> [!IMPORTANT] 
> Restart your TypeScript server if layer aliases don't resolve:
> 
> - **VS Code**: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
> - **WebStorm**: `Shift + Shift` → "Restart TypeScript Service" 

## Options

### Module Options

Configure in `wxt.config.ts`:

```ts
export default defineConfig({
  modules: ['wxt-module-layers'],
  layers: {
    // Where to find layers (default: 'layers/*')
    sources: [
      'layers/*',           	// All folders under /layers/
      'src/packages/*',     	// All folders under /src/packages/
      'vendor/analytics',   	// Single specific layer
    ],

    // Default alias template (default: true → '#{name}')
    layerAlias: '#{name}',  	// #analytics, #auth, etc.

    // Default auto-import folders (default: false)
    autoImports: true,      	// Enable default folders
    											  	// Specific folders: ['composables', 'utils'],

    // Default manual entrypoint files (default: {})
    entrypoints: {},  				// Manual might be { background: 'bg/index.ts', ... }

    // Default public file prefix (default: '{name}')
    publicPrefix: '{name}',  	// Outputs to /analytics/, /auth/, etc.

    // Logging level (default: 'info')
    logLevel: 'debug',  			// Use for troubleshooting
  }
})
```

> [!TIP]
> Use `logLevel: 'debug'` to see exactly what the module discovers and registers

### Layer Options

Most layers work fine with defaults. Configure when you need to:

- Control background script execution order
- Use non-standard folder structures
- Modify the extension manifest

```ts
// layers/analytics/layer.config.ts
import { defineLayer } from 'wxt-module-layers'

export default defineLayer({
  // Control background script order (default: 50, lower = earlier)
  order: 0,

  // Manually specify entrypoints (bypasses auto-discovery)
  entrypoints: {
    'background': 'background/index.ts',
    'content.linkedin': 'content/linkedin.ts',
    'content.twitter': 'content/twitter.ts',
  },

  // Modify extension manifest
  manifest: (wxt, manifest) => {
    manifest.permissions?.push('storage', 'cookies')
    manifest.host_permissions?.push('*://*.example.com/*')
  },

  // Override module defaults (rarely needed)
  layerAlias: '@analytics',
  autoImports: ['composables', 'services'],
  publicPrefix: 'tracking',
})
```

## Entrypoints

### Default Folder Structure

Layer entrypoints work exactly like WXT - place files in `entrypoints/`:

```yaml
layers/my-layer/
  entrypoints/
    background.ts       # Background script
    popup.html          # Popup UI
    content.ts          # Content script
    sidepanel.html      # Sidepanel
```

All standard WXT entrypoint patterns are supported.

### Multiple Layer Backgrounds

If you have multiple layer backgrounds (and no `src` background), a virtual module automatically loads and runs them in order:

```yaml
layers/
  core/entrypoints/background.ts
  analytics/entrypoints/background.ts
```

```ts
// layers/core/entrypoints/background.ts
export default defineBackground(async () => {
  // run code (even async code)
  console.log('Core background ready')
  
  // pass data to the next background layer
  return { state: 123 }
})
```

Output:

```
✓ Created virtual entrypoint for 2 layer backgrounds
```

Execution order is controlled by the `order` property in layer config (lower runs first):

```ts
// layers/core/layer.config.ts
export default defineLayer({
  order: 1,  // Runs first (default is 50)
})
```

### With Main Background

If you have a main `entrypoints/background.ts`, manually initialize layer backgrounds:

```ts
// entrypoints/background.ts
import coreBackground from '#core/entrypoints/background'
import analyticsBackground from '#analytics/entrypoints/background'

export default defineBackground(() => {
  coreBackground()
  analyticsBackground()

  // Your main logic
  console.log('Main background ready')
})
```

The module will warn you if manual initialization is needed.

### Manual Entrypoints

Use manual configuration for non-standard structures:

```yaml
layers/my-feature/
  background/
    index.ts
    services/
  panel/
    index.html
    services/
```

```ts
// layers/my-feature/layer.config.ts
export default defineLayer({
  entrypoints: {
    background: 'background/index.ts',
    sidepanel: 'panel/index.html',
  }
})
```

> [!TIP]
> You can set default `entrypoints` in module options to configure all layers at once (missing entrypoints are simply skipped).

### Named Content Scripts

Target different sites with separate content scripts:

```ts
export default defineLayer({
  entrypoints: {
    'content.linkedin': 'content/linkedin.ts',
    'content.twitter': 'content/twitter.ts',
    'content.github': 'content/github.ts',
  }
})
```

Each can specify its own match patterns:

```ts
// entrypoints/content.linkedin.ts
export default defineContentScript({
  matches: ['*://*.linkedin.com/*'],
  main () {
    // LinkedIn-specific logic
  }
})
```

## Debugging

### Enable Debug Logging

```ts
export default defineConfig({
  layers: {
    logLevel: 'debug',
  }
})
```

Output shows what's discovered:

```
[layers] Scanning 2 layer folders...
[layers] Processing layer: layers/analytics
[layers]   - alias: #analytics
[layers]   - entrypoint: content.ts (content)
[layers]   - auto-imports: composables, services
```

### Common Issues

**Aliases not resolving**:

- Restart TypeScript server
- Verify `layerAlias` isn't `false`

**Auto-imports not working**:

- Check `autoImports` is enabled
- Verify WXT's imports aren't disabled

**Entrypoints not found**:

- Use debug logging to see what's scanned
- Check file naming matches WXT conventions
- Check no duplicate entrypoint names
- Consider manual `entrypoints` config
