/* eslint-env es2021 */
const JsdomEnvironment = require("jest-environment-jsdom").default

class JsdomWithSomeNodeGlobals extends JsdomEnvironment {
  constructor(config, context) {
    super(config, context)
  }

  async setup() {
    await super.setup()

    // use nodejs webcrypto (w3c webcrypto spec compliant) as global.crypto in tests
    this.global.crypto = global.crypto.webcrypto
    this.global.crypto.subtle = global.crypto.subtle
    this.global.crypto.randomUUID = global.crypto.randomUUID.bind(global.crypto)
    this.global.CryptoKey = global.CryptoKey

    // JSDOM's Uint8Array implementation isn't compatible with 'node:crypto'
    this.global.Uint8Array = Object.getPrototypeOf(
      Object.getPrototypeOf(require("node:buffer").Buffer.from("")),
    ).constructor

    // some other globals we want to use from nodejs instead of jsdom
    // they're either missing in jsdom or they lack some critical functionality
    this.global.CompressionStream = require("node:stream/web").CompressionStream
    this.global.DecompressionStream = require("node:stream/web").DecompressionStream
    this.global.TextEncoder = require("node:util").TextEncoder
    this.global.TextDecoder = require("node:util").TextDecoder
  }
}

module.exports = JsdomWithSomeNodeGlobals
