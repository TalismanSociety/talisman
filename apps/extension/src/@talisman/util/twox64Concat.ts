import { u8aConcat, u8aToU8a, u8aToHex } from "@polkadot/util"
import { xxhashAsU8a } from "@polkadot/util-crypto"

const bitLength = 64

export default function twox64Concat(input: string | Buffer | Uint8Array): `0x${string}` {
  return u8aToHex(u8aConcat(xxhashAsU8a(input, bitLength), u8aToU8a(input)))
}
