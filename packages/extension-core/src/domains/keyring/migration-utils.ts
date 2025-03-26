import { KeypairType } from "@polkadot/util-crypto/types"
import { KeypairCurve } from "@talismn/crypto"

export const pjsKeypairTypeToCurve = (type: KeypairType): KeypairCurve => {
  switch (type) {
    case "ed25519":
    case "sr25519":
    case "ecdsa":
    case "ethereum":
      return type
  }
}

export const curveToPjsKeypairType = (curve: KeypairCurve): KeypairType => {
  switch (curve) {
    case "ed25519":
    case "sr25519":
    case "ecdsa":
    case "ethereum":
      return curve
    default:
      throw new Error("Unsupported curve")
  }
}
