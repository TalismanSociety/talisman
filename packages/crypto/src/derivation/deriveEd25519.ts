import { ed25519 } from "@noble/curves/ed25519"

import type { Keypair } from "../types"
import { addressFromPublicKey } from "../address"
import { deriveSubstrateSecretKey } from "./common"

export const deriveEd25519 = (seed: Uint8Array, derivationPath: string): Keypair => {
  const secretKey = deriveSubstrateSecretKey(seed, derivationPath, "Ed25519HDKD")

  const publicKey = getPublicKeyEd25519(secretKey)

  return {
    type: "ed25519",
    secretKey,
    publicKey,
    address: addressFromPublicKey(publicKey, "ss58"),
  }
}

export const getPublicKeyEd25519 = (secretKey: Uint8Array) => {
  return ed25519.getPublicKey(secretKey)
}
