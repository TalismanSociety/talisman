import { Bytes, str, Tuple, u32 } from "scale-ts"

import { blake2b256 } from "../hashing"

// Inspired from MIT licensed @polkadot-labs/hdkd helpers
// https://github.com/polkadot-labs/hdkd/blob/3ef6e02827212d934b59a4e566d8aa61d3ba7b27/packages/hdkd-helpers/src/parseDerivations.ts#L1

const DERIVATION_RE = /(\/{1,2})(\w+)/g

type DerivationDescriptor = [type: "hard" | "soft", code: string]

export const parseSubstrateDerivations = (derivationsStr: string): DerivationDescriptor[] => {
  const derivations = [] as DerivationDescriptor[]
  if (derivations)
    for (const [_, type, code] of derivationsStr.matchAll(DERIVATION_RE)) {
      derivations.push([type === "//" ? "hard" : "soft", code!])
    }
  return derivations
}

export const createChainCode = (code: string) => {
  const chainCode = new Uint8Array(32)
  chainCode.set(Number.isNaN(+code) ? str.enc(code) : u32.enc(+code))
  return chainCode
}

const derivationCodec = /* @__PURE__ */ Tuple(str, Bytes(32), Bytes(32))
const createSubstrateDeriveFn = (prefix: string) => (seed: Uint8Array, chainCode: Uint8Array) =>
  blake2b256(derivationCodec.enc([prefix, seed, chainCode]))

export const deriveSubstrateSecretKey = (
  seed: Uint8Array,
  derivationPath: string,
  prefix: string,
) => {
  const derivations = parseSubstrateDerivations(derivationPath)
  const derive = createSubstrateDeriveFn(prefix)

  return derivations.reduce((seed, [type, chainCode]) => {
    const code = createChainCode(chainCode)
    if (type === "soft") throw new Error("Soft derivations are not supported")
    return derive(seed, code)
  }, seed)
}
