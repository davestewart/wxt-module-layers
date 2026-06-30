import { defineConfig } from 'wxt'
import { HN_MATCHES } from './ext/utils/constants'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['wxt-module-layers'],

  layers: {
    // allow all public assets to show on hacker news
    publicAccess: HN_MATCHES,

    // nest all public assets in the named folders
    publicPrefix: 'assets/{name}/',

    // show all debug messages
    logLevel: 'debug',
  },

  srcDir: './ext',

  manifest: {
    name: 'HN Enhanced',
    description: 'A Hacker News enhancement extension — built with WXT Layers',
  },

  // open HN in the dev browser
  runner: {
    startUrls: ['https://news.ycombinator.com'],
  },

})
