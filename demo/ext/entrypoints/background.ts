import { main } from 'wxt-module-layers:background'

/**
 * Optional example background entrypoint
 *
 * This background entrypoint *manually* runs discovered
 * layer backgrounds, but you can remove the file, and they
 * will be run automatically by the module.
 *
 * An entrypoint is required if you want to run additional
 * code along with the layer backgrounds.
 *
 * You can also import layer background handlers directly
 * and run them manually.
 */
export default defineBackground(() => {
  console.log('background script loaded')
  main()
})
