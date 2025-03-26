import type { AddressEncoding } from "../types"
import { encodeAddressBase58, encodeAddressEthereum, encodeAddressSs58 } from "./encoding"

export type EncodeAddressOptions = {
  ss58Prefix?: number
}

export const addressFromPublicKey = (
  publicKey: Uint8Array,
  encoding: AddressEncoding,
  options?: EncodeAddressOptions,
): string => {
  switch (encoding) {
    case "ss58":
      return encodeAddressSs58(publicKey, options?.ss58Prefix)
    case "ethereum":
      return encodeAddressEthereum(publicKey)
    case "base58":
      return encodeAddressBase58(publicKey)
  }
}
