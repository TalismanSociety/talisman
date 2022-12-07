import { encodeAddress } from "@polkadot/keyring"
import { ethereumEncode, isEthereumAddress } from "@polkadot/util-crypto"

export function encodeAnyAddress(
  key: string | Uint8Array,
  ss58Format?: number | undefined
): string {
  try {
    return encodeAddress(key, ss58Format)
  } catch (error) {
    if (typeof key !== "string") throw error
    if (!isEthereumAddress(key)) throw error

    return ethereumEncode(key)
  }
}
