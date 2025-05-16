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
    case "bitcoin-ecdsa":
    case "bitcoin-ed25519":
      return "bitcoin"
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
    case "bech32m":
    case "bech32":
    case "base58check":
      return "bitcoin"
    case "base58":
      return "solana"
  }
}

export const platformFromAddress = (address: string): Platform => {
  const encoding = detectAddressEncoding(address)
  return platformFromEncoding(encoding)
}
