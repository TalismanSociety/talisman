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
  // When importing ed25519 polkadot-js accounts via json, which we do inside of `packages/extension-core/src/domains/keyring/getSecretKeyFromPjsJson.ts`,
  // the secretKey we produce is 64 bytes in length.
  //
  // When using the ed25519 curve to derive a publicKey for this 64 bytes privateKey, we should only take the first 32 bytes:
  // - https://github.com/paulmillr/noble-curves/issues/53#issuecomment-1577362759
  // - https://github.com/paulmillr/noble-curves/discussions/33#discussioncomment-5685971
  // - https://github.com/paulmillr/noble-curves/pull/54
  // - https://github.com/paulmillr/noble-curves/issues/88
  //
  // When you compare the ed25519 publicKey of a given account produced by this function to the publicKey produced by
  // polkadot-js, you will find that they are the same as eachother.
  if (secretKey.length === 64) return ed25519.getPublicKey(secretKey.slice(0, 32))

  return ed25519.getPublicKey(secretKey)
}
