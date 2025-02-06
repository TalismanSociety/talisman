import type { AddressEncoding, Keypair } from "../types"
import {
  addressEncodingFromCurve,
  encodeAddressBase58,
  encodeAddressEthereum,
  encodeAddressSs58,
} from "./encoding"

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

export const addressFromKeypair = (pair: Keypair, options?: EncodeAddressOptions): string => {
  const encoding = addressEncodingFromCurve(pair.type)
  return addressFromPublicKey(pair.publicKey, encoding, options)
}
