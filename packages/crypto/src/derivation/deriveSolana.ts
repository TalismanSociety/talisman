import { ed25519 } from "@noble/curves/ed25519"
import { hmac } from "@noble/hashes/hmac"
import { sha512 } from "@noble/hashes/sha512"

import type { Keypair } from "../types"
import { addressFromPublicKey } from "../address"

// Convert a path like "m/44'/501'/0'/0'" to an array of indexes
const parseDerivationPath = (path: string): number[] => {
  if (!path.startsWith("m/")) throw new Error("Path must start with 'm/'")
  return path
    .split("/")
    .slice(1) // Remove 'm'
    .map((p) => {
      if (!p.endsWith("'")) throw new Error("Only hardened derivation is supported")
      return parseInt(p.slice(0, -1), 10) + 0x80000000 // Convert to hardened index
    })
}

export const deriveSolana = (seed: Uint8Array, derivationPath: string): Keypair => {
  // Generate master private key using SLIP-0010 (HMAC-SHA512 with "ed25519 seed")
  let I = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed)
  let secretKey = I.slice(0, 32)
  let chainCode = I.slice(32)

  // Iterate over the derivation path and apply hardened key derivation
  for (const index of parseDerivationPath(derivationPath)) {
    // HMAC-SHA512(Key = chainCode, Data = 0x00 || privateKey || index)
    const data = new Uint8Array(1 + secretKey.length + 4)
    data.set([0x00], 0)
    data.set(secretKey, 1)
    data.set(
      new Uint8Array([
        (index >> 24) & 0xff,
        (index >> 16) & 0xff,
        (index >> 8) & 0xff,
        index & 0xff,
      ]),
      1 + secretKey.length,
    )

    I = hmac(sha512, chainCode, data)
    secretKey = I.slice(0, 32)
    chainCode = I.slice(32)
  }

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
