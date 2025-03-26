import { base58 } from "@scure/base"

import { blake2b256, blake2b512 } from "../../hashing"

// Inspired from MIT licensed @polkadot-labs/hdkd-helpers
// https://github.com/polkadot-labs/hdkd/blob/3ef6e02827212d934b59a4e566d8aa61d3ba7b27/packages/hdkd-helpers/src/accountId.ts#L3

const VALID_PUBLICKEY_LENGTHS = [32, 33]
const accountId = (publicKey: Uint8Array) => {
  if (!VALID_PUBLICKEY_LENGTHS.includes(publicKey.length)) throw new Error("Invalid publicKey")
  return publicKey.length === 33 ? blake2b256(publicKey) : publicKey
}

const SS58PRE = /* @__PURE__ */ new TextEncoder().encode("SS58PRE")
const CHECKSUM_LENGTH = 2

const VALID_PAYLOAD_LENGTHS = [32, 33]
const ss58Encode = (payload: Uint8Array, prefix = 42) => {
  if (!VALID_PAYLOAD_LENGTHS.includes(payload.length)) throw new Error("Invalid payload")

  const prefixBytes =
    prefix < 64
      ? Uint8Array.of(prefix)
      : Uint8Array.of(
          ((prefix & 0b0000_0000_1111_1100) >> 2) | 0b0100_0000,
          (prefix >> 8) | ((prefix & 0b0000_0000_0000_0011) << 6),
        )
  const checksum = blake2b512(Uint8Array.of(...SS58PRE, ...prefixBytes, ...payload)).subarray(
    0,
    CHECKSUM_LENGTH,
  )
  return base58.encode(Uint8Array.of(...prefixBytes, ...payload, ...checksum))
}

const VALID_ADDRESS_LENGTHS = [35, 36, 37]
export const decodeSs58Address = (addressStr: string): [publicKey: Uint8Array, prefix: number] => {
  const address = base58.decode(addressStr)
  if (!VALID_ADDRESS_LENGTHS.includes(address.length)) throw new Error("Invalid address length")

  const addressChecksum = address.subarray(address.length - CHECKSUM_LENGTH)
  const checksum = blake2b512(
    Uint8Array.of(...SS58PRE, ...address.subarray(0, address.length - CHECKSUM_LENGTH)),
  ).subarray(0, CHECKSUM_LENGTH)
  if (addressChecksum[0] !== checksum[0] || addressChecksum[1] !== checksum[1])
    throw new Error("Invalid checksum")

  const prefixLength = address[0]! & 0b0100_0000 ? 2 : 1
  const prefix: number =
    prefixLength === 1
      ? address[0]!
      : ((address[0]! & 0b0011_1111) << 2) | (address[1]! >> 6) | ((address[1]! & 0b0011_1111) << 8)
  const publicKey = address.slice(prefixLength, address.length - CHECKSUM_LENGTH)
  return [publicKey, prefix]
}

export const encodeAddressSs58 = (publicKey: Uint8Array | string, prefix = 42) => {
  if (typeof publicKey === "string") [publicKey] = decodeSs58Address(publicKey)
  return ss58Encode(accountId(publicKey), prefix)
}

export function isSs58Address(address: string): boolean {
  try {
    decodeSs58Address(address)
    return true
  } catch (error) {
    return false
  }
}
