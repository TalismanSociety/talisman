import { blake2b } from "@noble/hashes/blake2b"

export const blake2b256 = (msg: Uint8Array) => blake2b(msg, { dkLen: 32 })
export const blake2b512 = (msg: Uint8Array) => blake2b(msg, { dkLen: 64 })
