import type { AddressEncoding, KeypairCurve } from "../../types"

/** NOTE: Try not to use this too much, it will need to change */
export const addressEncodingFromCurve = (curve: KeypairCurve): AddressEncoding => {
  switch (curve) {
    case "sr25519":
    case "ed25519":
    case "ecdsa":
      return "ss58"
    case "bitcoin-ecdsa":
    case "bitcoin-ed25519":
      // NOTE: Bitcoin has multiple address formats, so this isn't necessarily correct
      // The format MAY be bech32m, but it might also be bech32 or base58check.
      // bech32m is the most recent format.
      return "bech32m"
    case "ethereum":
      return "ethereum"
    case "solana":
      return "base58solana"
  }
}
