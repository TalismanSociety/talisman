import { ed25519 } from "@noble/curves/ed25519.js"
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { keccak_256 } from "@noble/hashes/sha3.js"
import { sign as sr25519Sign, vrf as sr25519Vrf } from "@scure/sr25519"

import { blake2b256 } from "../hashing"
import type { KeypairCurve } from "../types"

/** noble's recovered signature format is v||r||s, substrate expects r||s||v */
const toRsv = (vrs: Uint8Array): Uint8Array => {
  const rsv = new Uint8Array(65)
  rsv.set(vrs.subarray(1), 0)
  rsv[64] = vrs[0]
  return rsv
}

/**
 * Signs a substrate payload with the given curve.
 *
 * Output is byte-compatible with polkadot-js `KeyringPair.sign` (without type prefix):
 * - sr25519/ed25519: 64-byte signature over the raw message
 * - ecdsa: 65-byte recoverable signature (r||s||v) over blake2b-256(message)
 * - ethereum: 65-byte recoverable signature (r||s||v) over keccak-256(message)
 *
 * Note: callers are responsible for the substrate >256-byte rule (hash the payload
 * with blake2b-256 before signing) — this matches where polkadot-js applies it.
 */
export const signSubstrate = (
  curve: KeypairCurve,
  secretKey: Uint8Array,
  message: Uint8Array
): Uint8Array => {
  switch (curve) {
    case "sr25519":
      return sr25519Sign(secretKey, message)
    case "ed25519":
      // substrate ed25519 secret keys may be stored as [seed(32) || publicKey(32)]; noble signs from the 32-byte seed
      return ed25519.sign(message, secretKey.length === 64 ? secretKey.subarray(0, 32) : secretKey)
    case "ecdsa":
      // prehash: false — noble v2 would otherwise sha256 the digest again, breaking polkadot-js parity
      return toRsv(
        secp256k1.sign(blake2b256(message), secretKey, { format: "recovered", prehash: false })
      )
    case "ethereum":
      return toRsv(
        secp256k1.sign(keccak_256(message), secretKey, { format: "recovered", prehash: false })
      )
    default:
      throw new Error(`Unsupported curve for substrate signing: ${curve}`)
  }
}

const EMPTY_BYTES = new Uint8Array()

/**
 * sr25519 VRF signature, byte-compatible with schnorrkel's `vrf_sign_extra` as exposed by
 * polkadot-js `sr25519VrfSign` (with an explicit empty default context, where polkadot-js
 * defaults to `"substrate"`).
 *
 * Returns 96 bytes: `output(32) || proof(64)`.
 *
 * Unlike regular sr25519 signatures (randomized nonce), the 32-byte VRF *output* is
 * deterministic for a given (secretKey, context, message, extra) — only the proof embeds
 * randomness. This is what makes it usable for signature-based key derivation.
 */
export const vrfSignSubstrate = (
  secretKey: Uint8Array,
  message: Uint8Array,
  context: Uint8Array = EMPTY_BYTES,
  extra: Uint8Array = EMPTY_BYTES
): Uint8Array => sr25519Vrf.sign(message, secretKey, context, extra)

/**
 * Verifies an sr25519 VRF signature produced by `vrfSignSubstrate` (or any schnorrkel
 * `vrf_sign_extra` implementation using the same context).
 */
export const vrfVerifySubstrate = (
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  context: Uint8Array = EMPTY_BYTES,
  extra: Uint8Array = EMPTY_BYTES
): boolean => sr25519Vrf.verify(message, signature, publicKey, context, extra)

/** MultiSignature enum variant index per signature scheme, used to type-prefix signatures */
export const SIGNATURE_TYPE_PREFIX: Partial<Record<KeypairCurve, number>> = {
  ed25519: 0,
  sr25519: 1,
  ecdsa: 2,
  ethereum: 2,
}
