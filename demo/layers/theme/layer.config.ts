import { defineLayer } from 'wxt-module-layers'

export default defineLayer({
  // run theme background script second
  order: 2,

  // change access for this layer's public files
  publicAccess: true,
})
