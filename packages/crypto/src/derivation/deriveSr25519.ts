import { randomBytes } from "@noble/hashes/utils"
import { getPublicKey, HDKD, secretFromSeed } from "micro-sr25519"

import type { Keypair } from "../types"
import { addressFromPublicKey } from "../address"
import { createChainCode, parseSubstrateDerivations } from "./common"

export const deriveSr25519 = (seed: Uint8Array, derivationPath: string): Keypair => {
  const derivations = parseSubstrateDerivations(derivationPath)

  const secretKey = derivations.reduce((secretKey, [type, chainCode]) => {
    const deriveFn = type === "hard" ? HDKD.secretHard : HDKD.secretSoft
    const code = createChainCode(chainCode)
    return deriveFn(secretKey, code, randomBytes)
  }, secretFromSeed(seed))

  const publicKey = getPublicKeySr25519(secretKey)
  return {
    type: "sr25519",
    secretKey,
    publicKey,
    address: addressFromPublicKey(publicKey, "ss58"),
  }
}

export const getPublicKeySr25519 = getPublicKey
