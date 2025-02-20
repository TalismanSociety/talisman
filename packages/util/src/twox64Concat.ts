import { u8aConcat, u8aToHex, u8aToU8a } from "@polkadot/util"
import { xxhashAsU8a } from "@polkadot/util-crypto"

const bitLength = 64

export function twox64Concat(input: string | Buffer | Uint8Array): `0x${string}` {
  const inputAsU8a = typeof input === "string" ? input : new Uint8Array(input)
  return u8aToHex(u8aConcat(xxhashAsU8a(inputAsU8a, bitLength), u8aToU8a(inputAsU8a)))
}
