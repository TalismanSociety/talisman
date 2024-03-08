// inspired from https://github.com/polkadot-api/polkadot-api/blob/main/packages/substrate-bindings/src/codecs/scale/AccountId.ts

import { blake2b } from "@noble/hashes/blake2b"
import { base58 } from "@scure/base"

const SS58_PREFIX = new TextEncoder().encode("SS58PRE")
const SS58_FORMAT = 42
const CHECKSUM_LENGTH = 2
const VALID_BYTES_LENGTH = [32, 33]

const encode = (publicKey: Uint8Array) => {
  const prefixBytes = Uint8Array.of(SS58_FORMAT)
  const checksum = blake2b(Uint8Array.of(...SS58_PREFIX, ...prefixBytes, ...publicKey), {
    dkLen: 64,
  }).subarray(0, CHECKSUM_LENGTH)
  return base58.encode(Uint8Array.of(...prefixBytes, ...publicKey, ...checksum))
}

const decode = (address: string) => {
  const decoded = base58.decode(address)
  const prefixBytes = decoded.subarray(0, decoded[0] & 0b0100_0000 ? 2 : 1)
  const publicKey = decoded.subarray(prefixBytes.length, decoded.length - CHECKSUM_LENGTH)

  if (!VALID_BYTES_LENGTH.includes(publicKey.length)) throw new Error("Invalid public key length")
  const checksum = decoded.subarray(prefixBytes.length + publicKey.length)
  const expectedChecksum = blake2b(Uint8Array.of(...SS58_PREFIX, ...prefixBytes, ...publicKey), {
    dkLen: 64,
  }).subarray(0, CHECKSUM_LENGTH)
  if (checksum[0] !== expectedChecksum[0] || checksum[1] !== expectedChecksum[1])
    throw new Error("Invalid checksum")

  return publicKey.slice()
}

export const normalizeSubAddress = (address: string) => {
  // source address might be encoded with a different prefix than 42
  // decode then reencode with prefix 42
  return encode(decode(address))
}
