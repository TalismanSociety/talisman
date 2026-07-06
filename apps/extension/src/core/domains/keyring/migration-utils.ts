import type { KeypairCurve } from "@talismn/crypto"

/** Same union as `KeypairType` from `@polkadot/util-crypto/types` */
export type PjsKeypairType = "ed25519" | "sr25519" | "ecdsa" | "ethereum"

export const pjsKeypairTypeToCurve = (type: PjsKeypairType): KeypairCurve => {
  switch (type) {
    case "ed25519":
    case "sr25519":
    case "ecdsa":
    case "ethereum":
      return type
  }
}

export const curveToPjsKeypairType = (curve: KeypairCurve): PjsKeypairType => {
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
