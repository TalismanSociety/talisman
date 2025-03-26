import { secp256k1 } from "@noble/curves/secp256k1"

import type { Keypair } from "../types"
import { addressFromPublicKey } from "../address"
import { deriveSubstrateSecretKey } from "./common"

export const deriveEcdsa = (seed: Uint8Array, derivationPath: string): Keypair => {
  const secretKey = deriveSubstrateSecretKey(seed, derivationPath, "Secp256k1HDKD")

  const publicKey = getPublicKeyEcdsa(secretKey)

  return {
    type: "ecdsa",
    secretKey,
    publicKey,
    address: addressFromPublicKey(publicKey, "ss58"),
  }
}

export const getPublicKeyEcdsa = (secretKey: Uint8Array) => {
  return secp256k1.getPublicKey(secretKey)
}
