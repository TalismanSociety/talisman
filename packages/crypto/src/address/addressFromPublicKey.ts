import type { AddressEncoding } from "../types"
import {
  type BitcoinHrp,
  encodeAddressEthereum,
  encodeAddressSolana,
  encodeAddressSs58,
  encodeP2trAddress,
  encodeP2wpkhAddress,
} from "./encoding"

export type EncodeAddressOptions = {
  ss58Prefix?: number
  bitcoinHrp?: BitcoinHrp
}

export const addressFromPublicKey = (
  publicKey: Uint8Array,
  encoding: AddressEncoding,
  options?: EncodeAddressOptions
): string => {
  switch (encoding) {
    case "ss58":
      return encodeAddressSs58(publicKey, options?.ss58Prefix)
    case "ethereum":
      return encodeAddressEthereum(publicKey)
    case "base58solana":
      return encodeAddressSolana(publicKey)
    case "bech32":
      return encodeP2wpkhAddress(publicKey, options?.bitcoinHrp)
    case "bech32m":
      return encodeP2trAddress(publicKey, options?.bitcoinHrp)
    case "base58check":
      throw new Error("Legacy bitcoin address types are not supported")
    case "bip32-xpub":
      throw new Error("An xpub cannot be derived from a single public key")
  }
}
