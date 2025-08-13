import type { AddressEncoding } from "../types"
import { encodeAddressEthereum, encodeAddressSolana, encodeAddressSs58 } from "./encoding"

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
    case "base58solana":
      return encodeAddressSolana(publicKey)
    case "bech32m":
    case "bech32":
    case "base58check":
      throw new Error("addressFromPublicKey is not implemented for Bitcoin")
  }
}
