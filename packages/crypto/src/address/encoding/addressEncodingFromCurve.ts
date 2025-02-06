import type { AddressEncoding, KeypairCurve } from "../../types"

export const addressEncodingFromCurve = (curve: KeypairCurve): AddressEncoding => {
  switch (curve) {
    case "sr25519":
    case "ed25519":
    case "ecdsa":
      return "ss58"
    case "ethereum":
      return "ethereum"
    case "solana":
      return "base58"
  }
}
