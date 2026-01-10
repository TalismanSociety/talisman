import { Buffer } from "node:buffer"
import { CompressionStream, DecompressionStream } from "node:stream/web"
import { TextDecoder, TextEncoder } from "node:util"

import type { Environment } from "vitest/environments"
import { builtinEnvironments } from "vitest/environments"

/**
 * Custom Vitest environment that extends jsdom with Node.js globals
 * needed for crypto operations and other Node-specific APIs
 */
const JsdomWithNodeGlobals: Environment = {
  name: "jsdom-with-node-globals",
  transformMode: "web",
  async setupVM(options) {
    return builtinEnvironments.jsdom.setupVM!(options)
  },
  async setup(global, options) {
    const { teardown } = await builtinEnvironments.jsdom.setup(global, options)

    // In Node 20+, crypto is already available globally and is read-only
    // We just need to ensure the subtle API is accessible
    // The globalThis.crypto in jsdom should already be the Node webcrypto

    // JSDOM's Uint8Array implementation isn't compatible with 'node:crypto'
    // Use the one from Node's buffer module instead
    global.Uint8Array = Object.getPrototypeOf(Object.getPrototypeOf(Buffer.from(""))).constructor

    // Some other globals we want to use from Node.js instead of jsdom
    // They're either missing in jsdom or they lack some critical functionality
    global.CompressionStream = CompressionStream
    global.DecompressionStream = DecompressionStream
    global.TextEncoder = TextEncoder
    global.TextDecoder = TextDecoder

    return { teardown }
  },
}

export default JsdomWithNodeGlobals
