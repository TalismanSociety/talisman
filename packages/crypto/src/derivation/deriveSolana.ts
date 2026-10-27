import { ed25519 } from "@noble/curves/ed25519.js"
import { hmac } from "@noble/hashes/hmac.js"
import { sha512 } from "@noble/hashes/sha2.js"
import { addressFromPublicKey } from "../address"
import type { Keypair } from "../types"

const HARDENED_OFFSET = 0x80000000

// Convert a path like "m/44'/501'/0'/0'" to an array of hardened indexes
const parseDerivationPath = (path: string): number[] => {
  if (!path.startsWith("m/")) throw new Error("Path must start with 'm/'")
  return path
    .split("/")
    .slice(1) // Remove 'm'
    .map((p) => {
      if (!p.endsWith("'")) throw new Error("Only hardened derivation is supported")
      const digits = p.slice(0, -1)
      if (!/^\d+$/.test(digits)) throw new Error(`Invalid derivation path index: ${p}`)
      const index = Number(digits)
      if (index >= HARDENED_OFFSET) throw new Error(`Derivation path index out of range: ${p}`)
      return index + HARDENED_OFFSET
    })
}

export const deriveSolana = (seed: Uint8Array, derivationPath: string): Keypair => {
  const indexes = parseDerivationPath(derivationPath)

  // Generate master private key using SLIP-0010 (HMAC-SHA512 with "ed25519 seed")
  let I = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed)
  let secretKey = I.slice(0, 32)
  let chainCode = I.slice(32)

  // Iterate over the derivation path and apply hardened key derivation
  for (const index of indexes) {
    // HMAC-SHA512(Key = chainCode, Data = 0x00 || privateKey || index)
    const data = new Uint8Array(1 + secretKey.length + 4)
    data.set([0x00], 0)
    data.set(secretKey, 1)
    new DataView(data.buffer).setUint32(1 + secretKey.length, index, false)

    I.fill(0)
    I = hmac(sha512, chainCode, data)
    data.fill(0)
    secretKey.fill(0)
    chainCode.fill(0)
    secretKey = I.slice(0, 32)
    chainCode = I.slice(32)
  }
  I.fill(0)
  chainCode.fill(0)

  const publicKey = getPublicKeySolana(secretKey)

  return {
    type: "solana",
    secretKey,
    publicKey,
    address: addressFromPublicKey(publicKey, "base58solana"),
  }
}

export const getPublicKeySolana = (secretKey: Uint8Array) => {
  return ed25519.getPublicKey(secretKey)
}
