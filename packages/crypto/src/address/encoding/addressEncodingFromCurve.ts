import type { AddressEncoding, KeypairCurve } from "../../types"

/** NOTE: Try not to use this too much, it will need to change */
export const addressEncodingFromCurve = (curve: KeypairCurve): AddressEncoding => {
  switch (curve) {
    case "sr25519":
    case "ed25519":
    case "ecdsa":
      return "ss58"
    case "bitcoin-ecdsa":
      // single-key bitcoin accounts (WIF imports) are always P2WPKH; taproot addresses
      // only exist on HD accounts, whose identity is an xpub rather than a curve-derived address
      return "bech32"
    case "ethereum":
      return "ethereum"
    case "solana":
      return "base58solana"
  }
}
