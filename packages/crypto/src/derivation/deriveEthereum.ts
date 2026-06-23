import { secp256k1 } from "@noble/curves/secp256k1.js"
import { HDKey } from "@scure/bip32"
import { addressFromPublicKey } from "../address"
import type { Keypair } from "../types"

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
  // noble v2 removed `utils.normPrivateKeyToScalar`; getPublicKey accepts the raw private-key
  // bytes directly and applies the same normalization internally → byte-identical pubkey.
  return secp256k1.getPublicKey(secretKey, false)
}
