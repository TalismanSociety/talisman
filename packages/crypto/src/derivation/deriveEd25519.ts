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
  if (secretKey.length === 64) {
    const [privateComponent, publicComponent] = [secretKey.slice(0, 32), secretKey.slice(32)]
    const publicKey = ed25519.getPublicKey(privateComponent)

    // NOTE: We only accept a 64 byte secretKey when the first 32 bytes successfully produce a public key which equals the second 32 bytes of the secretKey.
    //
    // In this scenario, we assume the creator of the secretKey has given us an array of bytes which equals `[...privateKey, ...publicKey]`.
    //
    // However, if the second 32 bytes **don't** match the publicKey produced by the first 32 bytes, we no longer know what's going on.
    //
    // In that case we pass the 64 bytes directly through to `@noble/curves/ed25519`, which we expect will throw the error: `private key of length 32 expected, got 64`.
    // But if there's some 64 byte key format for ed25519 we don't know about, or one is added in the future, `@noble/curves/ed25519` can handle that for us instead of throwing.
    if (!isUint8ArrayEq(publicComponent, publicKey)) return ed25519.getPublicKey(secretKey)

    return publicKey
  }

  return ed25519.getPublicKey(secretKey)
}

/** If a is identical to b, this function returns true, otherwise it returns false */
const isUint8ArrayEq = (a: Uint8Array, b: Uint8Array) =>
  a.length !== b.length || a.some((v, i) => v !== b[i]) ? false : true
