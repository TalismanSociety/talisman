import { blake2b } from "@noble/hashes/blake2b"
import { blake3 } from "@noble/hashes/blake3"
import { bytesToString } from "@scure/base"

export const blake2b256 = (msg: Uint8Array) => blake2b(msg, { dkLen: 32 })
export const blake2b512 = (msg: Uint8Array) => blake2b(msg, { dkLen: 64 })

export const getSafeHash = (bytes: Uint8Array) => {
  // cryptographically secure one way hash
  // outputs 44 characters without special characters
  return bytesToString("base58", blake3(bytes))
}
