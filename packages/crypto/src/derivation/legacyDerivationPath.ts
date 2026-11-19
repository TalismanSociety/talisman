import { str } from "scale-ts"

import type { KeypairCurve } from "../types"
import { deriveKeypair } from "./utils"

const HARDENED_OFFSET = 0x80000000

/** Whether this version's parser accepts `derivationPath`; the placeholder seed is never used. */
const isDerivable = (derivationPath: string, curve: KeypairCurve) => {
  try {
    deriveKeypair(new Uint8Array(32), derivationPath, curve)
    return true
  } catch {
    return false
  }
}

// The decimal junction code whose chain code is `bytes`: this version reads a decimal as a
// little-endian number of up to 256 bits.
const littleEndianDecimal = (bytes: Uint8Array) =>
  bytes.reduceRight((value, byte) => (value << 8n) | BigInt(byte), 0n).toString()

// Earlier versions kept only the `/code` and `//code` junctions they found and skipped every
// other character: `//hard///password` was `//hard//password`, `//Alice-Bob` was `//Alice`. A
// code that `+code` reads as a number was that number, wrapped to a u32: `//0x1000` was
// `//4096`, `//Infinity` was `//0`. Any other code was its SCALE-encoded text. This version
// reads text the same way, except a bare `0x`, which it rejects; the decimal code with the same
// chain code stands in for it (`//0x` was `//7876616`, the bytes `08 30 78`).
const legacySubstratePath = (derivationPath: string) =>
  [...derivationPath.matchAll(/(\/{1,2})(\w+)/g)]
    .map(([, separator = "", code = ""]) => {
      const number = Number(code)
      if (!Number.isNaN(number)) return separator + String(number >>> 0)
      return (
        separator +
        (isDerivable(`//${code}`, "sr25519") ? code : littleEndianDecimal(str.enc(code)))
      )
    })
    .join("")

// Earlier versions read each index with `parseInt` and wrote the hardened index with 32-bit
// shifts: `0abc'` was `0'`, and `4294967296'` wrapped to `0'`. An index that wrapped below the
// hardened offset, or that `parseInt` read as NaN, gave a non-hardened index, which no path
// derives now.
const legacySolanaPath = (derivationPath: string) => {
  if (!derivationPath.startsWith("m/")) return undefined
  const segments = derivationPath
    .split("/")
    .slice(1)
    .map((segment) => {
      if (!segment.endsWith("'")) return undefined
      const index = (Number.parseInt(segment.slice(0, -1), 10) + HARDENED_OFFSET) >>> 0
      return index >= HARDENED_OFFSET ? `${index - HARDENED_OFFSET}'` : undefined
    })
  if (segments.some((segment) => segment === undefined)) return undefined
  return `m/${segments.join("/")}`
}

/**
 * For a derivation path that this version rejects, the path that derives the key earlier
 * versions of this package derived from it. Earlier versions parsed substrate and Solana paths
 * leniently, so an account stored with such a path holds the key of another path: an account
 * stored as `//hard///password` holds the key of `//hard//password`, because the polkadot-js
 * password syntax was read as a hard junction.
 *
 * Returns `undefined` when this version accepts `derivationPath`, and when no path in the
 * current syntax derives the earlier key. Decimal substrate junctions of 2^32 and above are
 * accepted: earlier versions wrapped them to a u32 and this version derives the polkadot-js
 * key, so whether a stored account holds one or the other depends on the version that created
 * it, which the path doesn't tell.
 */
export const getLegacyDerivationPath = (
  derivationPath: string,
  curve: KeypairCurve
): string | undefined => {
  if (isDerivable(derivationPath, curve)) return undefined

  const legacyPath = (() => {
    switch (curve) {
      case "sr25519":
      case "ed25519":
      case "ecdsa":
        return legacySubstratePath(derivationPath)
      case "solana":
        return legacySolanaPath(derivationPath)
      default:
        return undefined
    }
  })()

  return legacyPath !== undefined && isDerivable(legacyPath, curve) ? legacyPath : undefined
}
