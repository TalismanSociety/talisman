/* eslint-env es2021 */

// mock WebSocket in tests
global.WebSocket = require("mock-socket").WebSocket

// this is required because the main library we've used to mock webextension-polyfill (jest-webextension-mock) does not provide a mock for the windows property
// so we use sinon-chrome for that instead. In order to be compatible with webextension-polyfill, we wrap the create method in a promise. It may be necessary
// to do this for other methods if they are used in tests.
const chrome = require("sinon-chrome")
global.chrome.windows = {
  ...chrome.windows,
  create: (...args) => new Promise((resolve) => resolve(chrome.windows.create(...args))),
}
global.chrome.alarms = chrome.alarms
global.browser.windows = global.chrome.windows

process.env.VERSION = process.env.npm_package_version

// hides this annoying warning which shows up for every test, as a result of us using pjs via an esm import:
// https://github.com/polkadot-js/api/issues/5636
//
// the warning isn't helpful in this context, and it also makes it a PITA to find the result of any failed tests
//
// we can remove this when we completely switch away from the @polkadot/api family of packages
process.env.POLKADOTJS_DISABLE_ESM_CJS_WARNING = "1"

// somehow not available in jest's jsdom
global.structuredClone = require("lodash-es/cloneDeep").default

// remove useless warnings
const originalWarn = console.warn
console.warn = (...args) => {
  const msg = args[0]?.toString?.()
  // This is a harmless runtime warning coming from the bigint-buffer or similar native addon dependency,
  // which tries (and fails) to load a native Node.js binding, then falls back to pure JavaScript.
  if (msg?.includes("bigint: Failed to load bindings")) return
  originalWarn(...args)
}
