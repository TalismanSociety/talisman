import { webcrypto } from "crypto"

// Ensure globalThis.crypto is available (for Node.js)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto
}
