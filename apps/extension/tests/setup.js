/* eslint-env es2021 */
const chrome = require("sinon-chrome")
const { TextDecoder } = require("@polkadot/x-textdecoder")
const { TextEncoder } = require("@polkadot/x-textencoder")
const { WebSocket } = require("mock-socket")

const { webcrypto } = require("crypto")
const cloneDeep = require("lodash/cloneDeep")

global.WebSocket = WebSocket
Object.defineProperty(globalThis, "crypto", {
  value: webcrypto,
})
global.CryptoKey = webcrypto.CryptoKey

global.TextDecoder = global.TextDecoder ?? TextDecoder
global.TextEncoder = global.TextEncoder ?? TextEncoder

// This is required because the main library we've used to mock webextension-polyfill (jest-webextension-mock) does not provide a mock for the windows property
// so we use sinon-chrome for that instead. In order to be compatible with webextension-polyfill, we wrap the create method in a promise. It may be necessary
// to do this for other methods if they are used in tests.

global.chrome.windows = {
  ...chrome.windows,
  create: (...args) => new Promise((resolve) => resolve(chrome.windows.create(...args))),
}
global.browser.windows = global.chrome.windows
global.chrome.alarms = chrome.alarms

process.env.VERSION = process.env.npm_package_version

// hides this annoying warning which shows up for every test, as a result of us using pjs via an esm import:
// https://github.com/polkadot-js/api/issues/5636
//
// the warning isn't helpful in this context, and it also makes it a PITA to find the result of any failed tests
//
// we can remove this when we completely switch away from the @polkadot/api family of packages
process.env.POLKADOTJS_DISABLE_ESM_CJS_WARNING = "1"

// somehow not available in jest's jsdom
global.structuredClone = cloneDeep
