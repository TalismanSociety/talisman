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
 * sr25519 VRF signature, byte-compatible with schnorrkel's `vrf_sign_extra` (polkadot-js
 * `sr25519VrfSign`, which defaults `context` to `"substrate"` where this defaults to empty).
 *
 * Returns `output(32) || proof(64)`. The output is `hash_to_point(context, message, publicKey)^
 * secretKey`, so it is deterministic per `(secretKey, context, message)` — unlike a regular
 * sr25519 signature, whose nonce is random. `extra` binds the proof transcript only and never
 * changes the output.
 *
 * Test-only: wallet-facing signing goes through `vrfSign`, which namespaces the context.
 */
export const vrfSignSubstrate = (
  secretKey: Uint8Array,
  message: Uint8Array,
  context: Uint8Array = EMPTY_BYTES,
  extra: Uint8Array = EMPTY_BYTES
): Uint8Array => sr25519Vrf.sign(message, secretKey, context, extra)

/**
 * Verifies a `vrfSignSubstrate` signature. Malformed input (wrong lengths, non-canonical points,
 * identity output) returns `false` rather than throwing.
 *
 * Test-only: signatures from `signer.signVrf` verify with `vrfVerify`.
 */
export const vrfVerifySubstrate = (
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  context: Uint8Array = EMPTY_BYTES,
  extra: Uint8Array = EMPTY_BYTES
): boolean => {
  try {
    return sr25519Vrf.verify(message, signature, publicKey, context, extra)
  } catch {
    return false
  }
}

const SUBSTRATE_VRF_TAG = new TextEncoder().encode("substrate-vrf")

/**
 * Effective signing context of the `substrate-vrf` namespace:
 * `"substrate-vrf" || u32_le(context.byteLength) || context`.
 *
 * The constant tag confines everything the wallet signs for external callers to one namespace, so
 * a caller-chosen context can never reproduce another schnorrkel protocol's transcript. It is
 * wallet-neutral on purpose: any wallet using the same frame derives the same identities, the way
 * `<Bytes>` keeps `signRaw` portable. The length prefix is redundant — the fixed-length tag
 * already makes the mapping injective, and Merlin length-frames the context anyway — but is part
 * of the layout.
 *
 * That layout is frozen: outputs are deterministic per effective context, so any change rotates
 * every derived identity. A revision must be a new opt-in tag, never a replacement.
 *
 * Test-only, not re-exported from the package — re-implementers work from the layout above.
 */
export const substrateVrfContext = (context: Uint8Array = EMPTY_BYTES): Uint8Array => {
  const effective = new Uint8Array(SUBSTRATE_VRF_TAG.length + 4 + context.length)
  effective.set(SUBSTRATE_VRF_TAG, 0)
  new DataView(effective.buffer).setUint32(SUBSTRATE_VRF_TAG.length, context.length, true)
  effective.set(context, SUBSTRATE_VRF_TAG.length + 4)
  return effective
}

/**
 * sr25519 VRF signature in the `substrate-vrf` namespace — what `signer.signVrf` produces. Verify
 * with `vrfVerify`, or any `vrf_verify_extra` over `substrateVrfContext(context)` and no extra.
 *
 * `extra` is not exposed: it changes the proof but not the output, so a caller using it as a
 * domain separator would derive one identity where they expect several.
 */
export const vrfSign = (
  secretKey: Uint8Array,
  message: Uint8Array,
  context?: Uint8Array
): Uint8Array => vrfSignSubstrate(secretKey, message, substrateVrfContext(context))

/** Verifies a signature produced by `vrfSign` for the given caller context. */
export const vrfVerify = (
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  context?: Uint8Array
): boolean => vrfVerifySubstrate(publicKey, message, signature, substrateVrfContext(context))

/** MultiSignature enum variant index per signature scheme, used to type-prefix signatures */
export const SIGNATURE_TYPE_PREFIX: Partial<Record<KeypairCurve, number>> = {
  ed25519: 0,
  sr25519: 1,
  ecdsa: 2,
  ethereum: 2,
}
