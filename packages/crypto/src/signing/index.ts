import type { KeypairCurve } from "../types"
import {
  signEd25519,
  signSecp256k1,
  signSr25519,
  verifySignatureEd25519,
  verifySignatureSecp256k1,
  verifySignatureSr25519,
} from "./utils"

export * from "./wrapBytes"

// Unused for now
export const sign = (
  payload: Uint8Array,
  secretKey: Uint8Array,
  curve: KeypairCurve,
): Uint8Array => {
  // TODO determine if we need to hash payloads before ecdsa signing
  // TODO determine if we need to wrap polkadot payloads with <Bytes></Bytes>

  switch (curve) {
    case "sr25519":
      return signSr25519(payload, secretKey)
    case "ed25519":
    case "solana":
      return signEd25519(payload, secretKey)
    case "ecdsa": // TODO pjs signs blake2 hashes - should we handle this?
      return signSecp256k1(payload, secretKey)
    case "ethereum": // TODO pjs signs keccak hashes - should we handle this?
      return signSecp256k1(payload, secretKey)
    default:
      throw new Error(`Unsupported curve: ${curve}`)
  }
}

// Unused for now
export const verifySignature = (
  payload: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
  curve: KeypairCurve,
) => {
  // TODO pad payload with <Bytes></Bytes> for polkadot checks ?

  switch (curve) {
    case "ethereum":
    case "ecdsa":
      return verifySignatureSecp256k1(payload, signature, publicKey)
    case "sr25519":
      return verifySignatureSr25519(payload, signature, publicKey)
    case "ed25519":
    case "solana":
      return verifySignatureEd25519(payload, signature, publicKey)
    default:
      throw new Error(`Unsupported algorithm/curve combination: ${curve}`)
  }
}
