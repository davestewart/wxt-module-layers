import { defineLayer } from 'wxt-module-layers'

export default defineLayer({
  // run tracker background script first
  order: 1,

  // auto-import stores
  autoImports: [
    'stores',
  ],

  // customise manifest
  manifest: (_wxt, manifest) => {
    // add storage permission
    manifest.permissions = manifest.permissions ?? []
    manifest.permissions.push('storage')

    // needed for sidebar action
    manifest.action = {}
  },
})
