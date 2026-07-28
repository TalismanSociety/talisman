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
 * Test-only: wallet-facing signing goes through `sr25519SignVrf`, which namespaces the context.
 */
export const sr25519SignVrfRaw = (
  secretKey: Uint8Array,
  message: Uint8Array,
  context: Uint8Array = EMPTY_BYTES,
  extra: Uint8Array = EMPTY_BYTES
): Uint8Array => sr25519Vrf.sign(message, secretKey, context, extra)

/**
 * Verifies a `sr25519SignVrfRaw` signature. Malformed input (wrong lengths, non-canonical points,
 * identity output) returns `false` rather than throwing.
 *
 * Test-only: signatures from `signer.signVrf` verify with `sr25519VerifyVrf`.
 */
export const sr25519VerifyVrfRaw = (
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
 * `"substrate-vrf" || u32_le(origin.len) || utf8(origin) || u32_le(context.len) || context`.
 *
 * The constant tag confines everything the wallet signs for external callers to one namespace, so
 * a caller-chosen context can never reproduce another schnorrkel protocol's transcript. `origin`
 * identifies who the output is derived for — the wallet passes the requesting site's web origin
 * (`scheme://host`), so one site can never obtain another's outputs, not even across schemes on
 * the same host — and `context` is the caller's own separator within that origin. The origin's
 * length prefix is what makes the pair injective: without it a caller could pick a `context` that
 * reconstructs another origin's frame. The trailing `context` prefix adds nothing on top (it is
 * the last field, and Merlin length-frames the whole effective context anyway); it stays because
 * the layout is frozen.
 *
 * That layout is frozen: outputs are deterministic per effective context, so any change rotates
 * every derived identity. A revision must be a new opt-in tag, never a replacement.
 *
 * Test-only, not re-exported from the package — re-implementers work from the layout above.
 */
export const substrateVrfContext = (
  origin: string,
  context: Uint8Array = EMPTY_BYTES
): Uint8Array => {
  const originBytes = new TextEncoder().encode(origin)
  const originOffset = SUBSTRATE_VRF_TAG.length + 4
  const contextOffset = originOffset + originBytes.length + 4

  const effective = new Uint8Array(contextOffset + context.length)
  const view = new DataView(effective.buffer)

  effective.set(SUBSTRATE_VRF_TAG, 0)
  view.setUint32(SUBSTRATE_VRF_TAG.length, originBytes.length, true)
  effective.set(originBytes, originOffset)
  view.setUint32(contextOffset - 4, context.length, true)
  effective.set(context, contextOffset)

  return effective
}

export type SubstrateVrfNamespace = {
  /** who the output is derived for, the requesting site's origin (`scheme://host`) when the wallet signs */
  origin: string
  /** the caller's own domain separator within `origin`, empty if omitted */
  context?: Uint8Array
}

/**
 * sr25519 VRF signature in the `substrate-vrf` namespace — what `signer.signVrf` produces. Verify
 * with `sr25519VerifyVrf`, or any `vrf_verify_extra` over `substrateVrfContext` and no extra.
 *
 * `extra` is not exposed: it changes the proof but not the output, so a caller using it as a
 * domain separator would derive one identity where they expect several.
 */
export const sr25519SignVrf = (
  secretKey: Uint8Array,
  message: Uint8Array,
  { origin, context }: SubstrateVrfNamespace
): Uint8Array => sr25519SignVrfRaw(secretKey, message, substrateVrfContext(origin, context))

/** Verifies a signature produced by `sr25519SignVrf` for the same origin and context. */
export const sr25519VerifyVrf = (
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  { origin, context }: SubstrateVrfNamespace
): boolean =>
  sr25519VerifyVrfRaw(publicKey, message, signature, substrateVrfContext(origin, context))

/** MultiSignature enum variant index per signature scheme, used to type-prefix signatures */
export const SIGNATURE_TYPE_PREFIX: Partial<Record<KeypairCurve, number>> = {
  ed25519: 0,
  sr25519: 1,
  ecdsa: 2,
  ethereum: 2,
}
