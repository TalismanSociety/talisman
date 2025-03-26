import { secp256k1 } from "@noble/curves/secp256k1"
import { HDKey } from "@scure/bip32"

import type { Keypair } from "../types"
import { addressFromPublicKey } from "../address"

export const deriveEthereum = (seed: Uint8Array, derivationPath: string): Keypair => {
  const hdkey = HDKey.fromMasterSeed(seed)

  const childKey = hdkey.derive(derivationPath)
  if (!childKey.privateKey) throw new Error("Invalid derivation path")
  const secretKey = new Uint8Array(childKey.privateKey)

  const publicKey = getPublicKeyEthereum(secretKey)

  return {
    type: "ethereum",
    secretKey,
    publicKey,
    address: addressFromPublicKey(publicKey, "ethereum"),
  }
}

export const getPublicKeyEthereum = (secretKey: Uint8Array) => {
  const scalar = secp256k1.utils.normPrivateKeyToScalar(secretKey)
  return secp256k1.getPublicKey(scalar, false)
}
