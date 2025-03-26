import { detectAddressEncoding } from "../address"
import { AddressEncoding, KeypairCurve, Platform } from "../types"

export const platformFromCurve = (curve: KeypairCurve): Platform => {
  switch (curve) {
    case "sr25519":
    case "ed25519":
    case "ecdsa":
      return "polkadot"
    case "ethereum":
      return "ethereum"
    case "solana":
      return "solana"
  }
}

export const platformFromEncoding = (encoding: AddressEncoding): Platform => {
  switch (encoding) {
    case "ss58":
      return "polkadot"
    case "ethereum":
      return "ethereum"
    case "base58":
      return "solana"
  }
}

export const platformFromAddress = (address: string): Platform => {
  const encoding = detectAddressEncoding(address)
  return platformFromEncoding(encoding)
}
