/* eslint-disable no-undef */
var window = self
window.screen = {
  height: 0,
  width: 0,
}
try {
  // These are the files produced by webpack
  // this enables us to break files up with webpack chunking but still have a single service worker in the manifest
  importScripts("./vendor-background.js", "./background.js")
} catch (e) {
  // This will allow you to see error logs during registration/execution
  console.error(e)
}
