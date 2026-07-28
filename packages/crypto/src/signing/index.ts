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
 * Unlike regular sr25519 signatures (randomized nonce), the 32-byte VRF *output* is fully
 * determined by `(secretKey, context, message)` — it is `hash_to_point(context, message,
 * publicKey)^secretKey`. This is what makes it usable for signature-based key derivation.
 *
 * `context` is the only domain separator of the output: two different contexts over the same
 * message yield unrelated outputs. `extra` binds the DLEQ *proof* transcript only and does
 * **not** change the output — signing the same `(secretKey, context, message)` under different
 * `extra` values yields the same 32 bytes. The proof itself embeds randomness and is verifiable
 * against the public key.
 *
 * Exported for tests only — not part of the package's public surface. Wallet-facing VRF
 * signing must go through `vrfSign`, which namespaces the context.
 */
export const vrfSignSubstrate = (
  secretKey: Uint8Array,
  message: Uint8Array,
  context: Uint8Array = EMPTY_BYTES,
  extra: Uint8Array = EMPTY_BYTES
): Uint8Array => sr25519Vrf.sign(message, secretKey, context, extra)

/**
 * Verifies an sr25519 VRF signature produced by `vrfSignSubstrate` (or any schnorrkel
 * `vrf_sign_extra` implementation using the same context and extra).
 *
 * Malformed input (non-canonical points, wrong lengths, identity output point) verifies as
 * `false` rather than throwing.
 *
 * Exported for tests only — not part of the package's public surface. Signatures from
 * `signer.signVrf` verify with `vrfVerify`.
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
 * Builds the effective schnorrkel signing context of the `substrate-vrf` namespace:
 * `"substrate-vrf" || u32_le(context.byteLength) || context`.
 *
 * The constant tag confines everything a wallet signs on behalf of external callers to a
 * dedicated VRF namespace: a caller-chosen context can never reproduce another protocol's
 * `vrf_sign_extra` transcript (nor a wallet's internal key-derivation outputs for the same
 * seed), because no other protocol's context starts with these bytes. The fixed-length tag alone
 * already makes the mapping injective, and schnorrkel's Merlin transcript length-frames the whole
 * context on top of that: the explicit length prefix is redundant, and is kept only because the
 * layout is frozen.
 *
 * The tag is deliberately wallet-neutral: any substrate wallet implementing the same
 * construction produces identical outputs for the same account and inputs, keeping
 * VRF-derived identities portable across wallets. This is the `<Bytes>` wrapping story of
 * `signRaw`, applied to VRF — interop comes from sharing the frame, not from omitting it.
 *
 * The layout is frozen: outputs are deterministic per effective context, so any change here
 * would rotate every identity derived from these outputs. A future revision must be an
 * additive, opt-in namespace under a new tag (e.g. `substrate-vrf-v2`), never a replacement.
 *
 * Exported for tests only — the package entry point does not re-export it, and `vrfSign`/
 * `vrfVerify` apply it. Re-implementers work from the layout documented above.
 */
export const substrateVrfContext = (context: Uint8Array = EMPTY_BYTES): Uint8Array => {
  const effective = new Uint8Array(SUBSTRATE_VRF_TAG.length + 4 + context.length)
  effective.set(SUBSTRATE_VRF_TAG, 0)
  new DataView(effective.buffer).setUint32(SUBSTRATE_VRF_TAG.length, context.length, true)
  effective.set(context, SUBSTRATE_VRF_TAG.length + 4)
  return effective
}

/**
 * sr25519 VRF signature in the `substrate-vrf` namespace: `vrfSignSubstrate` with the
 * context wrapped by `substrateVrfContext`. This is what `signer.signVrf` produces — use
 * `vrfVerify` (or any schnorrkel `vrf_verify_extra` with the same effective context)
 * to verify.
 */
export const vrfSign = (
  secretKey: Uint8Array,
  message: Uint8Array,
  context?: Uint8Array,
  extra?: Uint8Array
): Uint8Array => vrfSignSubstrate(secretKey, message, substrateVrfContext(context), extra)

/** Verifies a signature produced by `vrfSign` for the given caller context. */
export const vrfVerify = (
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
  context?: Uint8Array,
  extra?: Uint8Array
): boolean => vrfVerifySubstrate(publicKey, message, signature, substrateVrfContext(context), extra)

/** MultiSignature enum variant index per signature scheme, used to type-prefix signatures */
export const SIGNATURE_TYPE_PREFIX: Partial<Record<KeypairCurve, number>> = {
  ed25519: 0,
  sr25519: 1,
  ecdsa: 2,
  ethereum: 2,
}
