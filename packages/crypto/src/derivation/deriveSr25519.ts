import { getPublicKey, HDKD, secretFromSeed } from "@scure/sr25519"
import { addressFromPublicKey } from "../address"
import type { Keypair } from "../types"
import { createChainCode, parseSubstrateDerivations } from "./common"

export const deriveSr25519 = (seed: Uint8Array, derivationPath: string): Keypair => {
  const derivations = parseSubstrateDerivations(derivationPath)

  const secretKey = derivations.reduce<Uint8Array>((secretKey, [type, chainCode]) => {
    const code = createChainCode(chainCode)
    // @scure/sr25519's HDKD changed `secretSoft`'s 3rd arg from an RNG function (micro-sr25519)
    // to an optional 32-byte `random`; `secretHard` takes only (secretKey, chainCode). Omit the
    // random arg — HDKD derivation output is deterministic regardless of it.
    return type === "hard" ? HDKD.secretHard(secretKey, code) : HDKD.secretSoft(secretKey, code)
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
