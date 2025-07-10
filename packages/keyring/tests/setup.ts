import crypto from "crypto"

// @ts-expect-error use web implementation of crypto modules
global.crypto = crypto.webcrypto

// this works too, same performance as above
// global.crypto = crypto

// Polyfill for structuredClone (not available in Node.js < 17)
if (typeof structuredClone === "undefined") {
  global.structuredClone = (o) => ({ ...o })
}
