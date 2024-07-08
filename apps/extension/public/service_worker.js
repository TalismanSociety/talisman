/* eslint-env es2021 */
/* eslint-disable no-undef */
/* global importScripts */

// eslint-disable-next-line no-global-assign, no-unused-vars
const document = self
// needed because of https://github.com/paritytech/txwrapper-core/pull/384
// TODO delete when txwrapper-core is updated
self.process = {
  env: {
    TXWRAPPER_METADATA_CACHE_MAX: undefined,
  },
}

if (typeof self !== "undefined" && self instanceof ServiceWorkerGlobalScope) {
  try {
    // These are the files produced by webpack
    // this enables us to break files up with webpack chunking but still have a single service worker in the manifest
    importScripts("./vendor-background.js", "./background.js")
  } catch (e) {
    // This will allow you to see error logs during registration/execution
    console.error(e)
  }
}
