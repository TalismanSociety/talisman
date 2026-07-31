import { vrf as sr25519Vrf } from "@scure/sr25519"

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
