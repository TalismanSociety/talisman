import { detectAddressEncoding } from "../address"
import type { AccountPlatform, AddressEncoding, KeypairCurve } from "../types"

export const getAccountPlatformFromCurve = (curve: KeypairCurve): AccountPlatform => {
  switch (curve) {
    case "sr25519":
    case "ed25519":
    case "ecdsa":
      return "polkadot"
    case "ethereum":
      return "ethereum"
    case "bitcoin-ecdsa":
      return "bitcoin"
    case "solana":
      return "solana"
  }
}

export const getAccountPlatformFromEncoding = (encoding: AddressEncoding): AccountPlatform => {
  switch (encoding) {
    case "ss58":
      return "polkadot"
    case "ethereum":
      return "ethereum"
    case "bech32m":
    case "bech32":
    case "base58check":
    case "bip32-xpub":
      return "bitcoin"
    case "base58solana":
      return "solana"
  }
}

export const getAccountPlatformFromAddress = (address: string): AccountPlatform => {
  const encoding = detectAddressEncoding(address)
  return getAccountPlatformFromEncoding(encoding)
}
