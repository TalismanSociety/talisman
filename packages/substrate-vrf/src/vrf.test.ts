import { hex } from "@scure/base"
import { describe, expect, it } from "vitest"

import { sr25519SignVrf, sr25519VerifyVrf, substrateVrfContext } from "."
import { sr25519SignVrfRaw, sr25519VerifyVrfRaw } from "./vrf"

const MSG_SHORT = new TextEncoder().encode("talisman parity vector")
const MSG_LONG = new Uint8Array(300).fill(42)

describe("sr25519SignVrfRaw (schnorrkel parity)", () => {
  // //Alice substrate dev key
  const secretKey = hex.decode(
    "98319d4ff8a9508c4bb0cf0b5a78d760a0b2082c02775e6e82370816fedfff48925a225d97aa00682d6a59b95b18780c10d7032336e88f3442b42361f4a66011"
  )
  const publicKey = hex.decode("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d")

  // generated with @polkadot/util-crypto 14.0.3 (wasm schnorrkel) sr25519VrfSign, empty ctx/extra
  const WASM_OUTPUT = "5ebd74106216d6fe7d3f56b52d5bd8a755e2af12bcb2ff7786600856d4ca9d55"
  const WASM_SIGNATURE =
    "5ebd74106216d6fe7d3f56b52d5bd8a755e2af12bcb2ff7786600856d4ca9d5519a7ffebfe360361a2183dda7f75638cea8d29cdaeaa4a8650600b8fab4e650eccf24b53c0b17e51c2891eff23e37f5af855ada7dbfe42f601f57149fa572704"

  it("produces the wasm-schnorrkel deterministic output", () => {
    const sig1 = sr25519SignVrfRaw(secretKey, MSG_SHORT)
    const sig2 = sr25519SignVrfRaw(secretKey, MSG_SHORT)
    expect(sig1.length).toBe(96)
    expect(hex.encode(sig1.subarray(0, 32))).toBe(WASM_OUTPUT)
    expect(hex.encode(sig2.subarray(0, 32))).toBe(WASM_OUTPUT)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, sig1)).toBe(true)
  })

  it("verifies a wasm-schnorrkel signature", () => {
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, hex.decode(WASM_SIGNATURE))).toBe(true)
  })

  it("rejects a signature over a different message", () => {
    const sig = sr25519SignVrfRaw(secretKey, MSG_SHORT)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_LONG, sig)).toBe(false)
  })

  it("domain-separates by context", () => {
    const sig = sr25519SignVrfRaw(secretKey, MSG_SHORT, new TextEncoder().encode("ctx"))
    expect(hex.encode(sig.subarray(0, 32))).not.toBe(WASM_OUTPUT)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, sig)).toBe(false)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, sig, new TextEncoder().encode("ctx"))).toBe(
      true
    )
  })

  // extra is not part of hash_to_point: deriving one identity per purpose needs a distinct context
  it("does not domain-separate by extra", () => {
    const ctx = new TextEncoder().encode("ctx")
    const sigA = sr25519SignVrfRaw(secretKey, MSG_SHORT, ctx, new TextEncoder().encode("a"))
    const sigB = sr25519SignVrfRaw(secretKey, MSG_SHORT, ctx, new TextEncoder().encode("b"))

    expect(hex.encode(sigA.subarray(0, 32))).toBe(hex.encode(sigB.subarray(0, 32)))
    expect(hex.encode(sigA.subarray(0, 32))).toBe(
      hex.encode(sr25519SignVrfRaw(secretKey, MSG_SHORT, ctx).subarray(0, 32))
    )
  })

  it("binds the proof to extra", () => {
    const ctx = new TextEncoder().encode("ctx")
    const extra = new TextEncoder().encode("a")
    const sig = sr25519SignVrfRaw(secretKey, MSG_SHORT, ctx, extra)

    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, sig, ctx, extra)).toBe(true)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, sig, ctx, new TextEncoder().encode("b"))).toBe(
      false
    )
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, sig, ctx)).toBe(false)
  })

  it("rejects malformed input instead of throwing", () => {
    const sig = sr25519SignVrfRaw(secretKey, MSG_SHORT)

    const identityOutput = Uint8Array.from(sig)
    identityOutput.fill(0, 0, 32)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, identityOutput)).toBe(false)

    const invalidOutput = Uint8Array.from(sig)
    invalidOutput.fill(0xff, 0, 32)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, invalidOutput)).toBe(false)

    const nonCanonicalScalar = Uint8Array.from(sig)
    nonCanonicalScalar.fill(0xff, 32, 64)
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, nonCanonicalScalar)).toBe(false)

    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, sig.subarray(0, 95))).toBe(false)
    expect(sr25519VerifyVrfRaw(publicKey.subarray(0, 31), MSG_SHORT, sig)).toBe(false)
    expect(sr25519VerifyVrfRaw(new Uint8Array(32).fill(0xff), MSG_SHORT, sig)).toBe(false)
  })
})

describe("substrate-vrf namespace", () => {
  // //Alice substrate dev key
  const secretKey = hex.decode(
    "98319d4ff8a9508c4bb0cf0b5a78d760a0b2082c02775e6e82370816fedfff48925a225d97aa00682d6a59b95b18780c10d7032336e88f3442b42361f4a66011"
  )
  const publicKey = hex.decode("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d")

  const utf8 = (value: string) => new TextEncoder().encode(value)
  const TAG = hex.encode(utf8("substrate-vrf"))
  const ORIGIN = "https://app.example.com"
  const output = (signature: Uint8Array) => hex.encode(signature.subarray(0, 32))

  // frozen layout: asserted byte-exactly because a change rotates every derived identity
  it("builds the frozen effective context layout", () => {
    expect(hex.encode(substrateVrfContext(""))).toBe(`${TAG}0000000000000000`)
    expect(hex.encode(substrateVrfContext("ab", utf8("ctx")))).toBe(
      `${TAG}02000000${hex.encode(utf8("ab"))}03000000${hex.encode(utf8("ctx"))}`
    )
  })

  it("signs and verifies within the namespace", () => {
    const context = utf8("ctx")
    const sig = sr25519SignVrf(secretKey, MSG_SHORT, { origin: ORIGIN, context })

    expect(sig.length).toBe(96)
    expect(sr25519VerifyVrf(publicKey, MSG_SHORT, sig, { origin: ORIGIN, context })).toBe(true)
    expect(output(sr25519SignVrf(secretKey, MSG_SHORT, { origin: ORIGIN, context }))).toBe(
      output(sig)
    )
    // caller contexts still domain-separate each other within one origin
    expect(
      output(sr25519SignVrf(secretKey, MSG_SHORT, { origin: ORIGIN, context: utf8("ctx2") }))
    ).not.toBe(output(sig))
  })

  // the point of the origin field: another site cannot obtain this site's outputs
  it("domain-separates by origin", () => {
    const context = utf8("ctx")
    const sig = sr25519SignVrf(secretKey, MSG_SHORT, { origin: ORIGIN, context })

    expect(
      output(sr25519SignVrf(secretKey, MSG_SHORT, { origin: "https://evil.example.com", context }))
    ).not.toBe(output(sig))
    expect(
      sr25519VerifyVrf(publicKey, MSG_SHORT, sig, { origin: "https://evil.example.com", context })
    ).toBe(false)
  })

  // the origin length prefix is what stops a context from reconstructing another origin's frame
  it("does not let a context impersonate another origin", () => {
    expect(
      output(sr25519SignVrf(secretKey, MSG_SHORT, { origin: "ab", context: utf8("cd") }))
    ).not.toBe(output(sr25519SignVrf(secretKey, MSG_SHORT, { origin: "abcd" })))
  })

  // the wallet must not act as a VRF oracle: no verification across the boundary, either way
  it("does not verify across the namespace boundary", () => {
    const context = utf8("ctx")

    const namespaced = sr25519SignVrf(secretKey, MSG_SHORT, { origin: ORIGIN, context })
    expect(sr25519VerifyVrfRaw(publicKey, MSG_SHORT, namespaced, context)).toBe(false)

    const raw = sr25519SignVrfRaw(secretKey, MSG_SHORT, context)
    expect(sr25519VerifyVrf(publicKey, MSG_SHORT, raw, { origin: ORIGIN, context })).toBe(false)

    expect(output(namespaced)).not.toBe(output(raw))
  })
})
