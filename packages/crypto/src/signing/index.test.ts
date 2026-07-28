import { verify as sr25519Verify } from "@scure/sr25519"
import { describe, expect, it } from "vitest"

import { hex } from "../utils"
import {
  signSubstrate,
  substrateVrfContext,
  vrfSign,
  vrfSignSubstrate,
  vrfVerify,
  vrfVerifySubstrate,
} from "."

// polkadot-js KeyringPair.sign parity vectors, generated with @polkadot/keyring 14.0.3.
// Secret keys are the //Alice (substrate) / hardhat #0 (ethereum) dev keys.
// sr25519 is non-deterministic so it is covered by a sign+verify round-trip instead.
const VECTORS = [
  {
    curve: "ed25519",
    secretKey: "0xabf8e5bdbe30c65656c0a3cbd181ff8a56294a69dfedd27982aace4a76909115",
    sigShort:
      "0xef161147dc516a70f6ce3d0fe7b22036e11e5c9147de72daf974d0781ff544484259435436eae4c1c7cd67cc9e8fba94529df4ee4e089f8ce90a1e039c59d10f",
    sigLong:
      "0x8bc071d4875ba8aef0b4aff85d7b78067d2938f43ed7b70301c7202f20ca037a92ad4c4eeb1aa68e303322e0a48b07ea4b80b062597ddc6bfd122b34d81eb701",
  },
  {
    curve: "ecdsa",
    secretKey: "0xcb6df9de1efca7a3998a8ead4e02159d5fa99c3e0d4fd6432667390bb4726854",
    sigShort:
      "0x95c27ecd2073957f4c0192e09eddae27875e7ec8ae66846e9ee56013f87779e63a89370893d8c039f38c799ddc462f980529dd2c3aec34a99798a70f62980d7400",
    sigLong:
      "0x8af496732cb3b74a770c61e0154935dcca6edf697ea159fe91d2d342a192f354286e39ac7731be31639a54439143fa15fc49afd864c4e91af1ce63420046250a00",
  },
  {
    curve: "ethereum",
    secretKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    sigShort:
      "0x9dae51c75fbc99537fda769e9f128738c84321b62d111e75b763805fe69e432f665ea469e21ad6b8990a9a899dd39464d017d4881dd9f66649b0008e5718c70701",
    sigLong:
      "0x5c5bd511bd9056cc169775782c97531356f219fa1426cac81723b5abac3258cc16eb7564e303cc05f8c6c5545632472ca9f1a8de7078e7e10f407d2fd67b6f6b01",
  },
] as const

const MSG_SHORT = new TextEncoder().encode("talisman parity vector")
// pjs KeyringPair.sign does not hash long messages — the substrate >256-byte blake2 rule
// is applied by callers at the extrinsic level, so the vectors here sign the raw bytes
const MSG_LONG = new Uint8Array(300).fill(42)

describe("signSubstrate (polkadot-js parity)", () => {
  for (const { curve, secretKey, sigShort, sigLong } of VECTORS) {
    it(curve, () => {
      expect(
        `0x${hex.encode(signSubstrate(curve, hex.decode(secretKey.slice(2)), MSG_SHORT))}`
      ).toBe(sigShort)
      expect(
        `0x${hex.encode(signSubstrate(curve, hex.decode(secretKey.slice(2)), MSG_LONG))}`
      ).toBe(sigLong)
    })
  }

  it("sr25519 round-trip", () => {
    const secretKey = hex.decode(
      "98319d4ff8a9508c4bb0cf0b5a78d760a0b2082c02775e6e82370816fedfff48925a225d97aa00682d6a59b95b18780c10d7032336e88f3442b42361f4a66011"
    )
    const publicKey = hex.decode("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d")
    const sig = signSubstrate("sr25519", secretKey, MSG_SHORT)
    expect(sig.length).toBe(64)
    expect(sr25519Verify(MSG_SHORT, sig, publicKey)).toBe(true)
  })
})

describe("vrfSignSubstrate (schnorrkel parity)", () => {
  // //Alice substrate dev key
  const secretKey = hex.decode(
    "98319d4ff8a9508c4bb0cf0b5a78d760a0b2082c02775e6e82370816fedfff48925a225d97aa00682d6a59b95b18780c10d7032336e88f3442b42361f4a66011"
  )
  const publicKey = hex.decode("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d")

  // generated with @polkadot/util-crypto 14.0.3 (wasm schnorrkel) sr25519VrfSign, empty
  // context/extra. The 32-byte output is deterministic, the 64-byte proof is randomized.
  const WASM_OUTPUT = "5ebd74106216d6fe7d3f56b52d5bd8a755e2af12bcb2ff7786600856d4ca9d55"
  const WASM_SIGNATURE =
    "5ebd74106216d6fe7d3f56b52d5bd8a755e2af12bcb2ff7786600856d4ca9d5519a7ffebfe360361a2183dda7f75638cea8d29cdaeaa4a8650600b8fab4e650eccf24b53c0b17e51c2891eff23e37f5af855ada7dbfe42f601f57149fa572704"

  it("produces the wasm-schnorrkel deterministic output", () => {
    const sig1 = vrfSignSubstrate(secretKey, MSG_SHORT)
    const sig2 = vrfSignSubstrate(secretKey, MSG_SHORT)
    expect(sig1.length).toBe(96)
    expect(hex.encode(sig1.subarray(0, 32))).toBe(WASM_OUTPUT)
    // deterministic output, randomized proof
    expect(hex.encode(sig2.subarray(0, 32))).toBe(WASM_OUTPUT)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, sig1)).toBe(true)
  })

  it("verifies a wasm-schnorrkel signature", () => {
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, hex.decode(WASM_SIGNATURE))).toBe(true)
  })

  it("rejects a signature over a different message", () => {
    const sig = vrfSignSubstrate(secretKey, MSG_SHORT)
    expect(vrfVerifySubstrate(publicKey, MSG_LONG, sig)).toBe(false)
  })

  it("domain-separates by context", () => {
    const sig = vrfSignSubstrate(secretKey, MSG_SHORT, new TextEncoder().encode("ctx"))
    expect(hex.encode(sig.subarray(0, 32))).not.toBe(WASM_OUTPUT)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, sig)).toBe(false)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, sig, new TextEncoder().encode("ctx"))).toBe(
      true
    )
  })

  // extra binds the DLEQ proof transcript, it is not part of hash_to_point - callers deriving
  // one identity per purpose must vary context (or the message), varying extra achieves nothing
  it("does not domain-separate by extra", () => {
    const ctx = new TextEncoder().encode("ctx")
    const sigA = vrfSignSubstrate(secretKey, MSG_SHORT, ctx, new TextEncoder().encode("a"))
    const sigB = vrfSignSubstrate(secretKey, MSG_SHORT, ctx, new TextEncoder().encode("b"))

    expect(hex.encode(sigA.subarray(0, 32))).toBe(hex.encode(sigB.subarray(0, 32)))
    expect(hex.encode(sigA.subarray(0, 32))).toBe(
      hex.encode(vrfSignSubstrate(secretKey, MSG_SHORT, ctx).subarray(0, 32))
    )
  })

  it("binds the proof to extra", () => {
    const ctx = new TextEncoder().encode("ctx")
    const extra = new TextEncoder().encode("a")
    const sig = vrfSignSubstrate(secretKey, MSG_SHORT, ctx, extra)

    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, sig, ctx, extra)).toBe(true)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, sig, ctx, new TextEncoder().encode("b"))).toBe(
      false
    )
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, sig, ctx)).toBe(false)
  })

  it("rejects malformed input instead of throwing", () => {
    const sig = vrfSignSubstrate(secretKey, MSG_SHORT)

    const identityOutput = Uint8Array.from(sig)
    identityOutput.fill(0, 0, 32)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, identityOutput)).toBe(false)

    const invalidOutput = Uint8Array.from(sig)
    invalidOutput.fill(0xff, 0, 32)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, invalidOutput)).toBe(false)

    const nonCanonicalScalar = Uint8Array.from(sig)
    nonCanonicalScalar.fill(0xff, 32, 64)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, nonCanonicalScalar)).toBe(false)

    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, sig.subarray(0, 95))).toBe(false)
    expect(vrfVerifySubstrate(publicKey.subarray(0, 31), MSG_SHORT, sig)).toBe(false)
    expect(vrfVerifySubstrate(new Uint8Array(32).fill(0xff), MSG_SHORT, sig)).toBe(false)
  })
})

describe("substrate-vrf namespace", () => {
  // //Alice substrate dev key
  const secretKey = hex.decode(
    "98319d4ff8a9508c4bb0cf0b5a78d760a0b2082c02775e6e82370816fedfff48925a225d97aa00682d6a59b95b18780c10d7032336e88f3442b42361f4a66011"
  )
  const publicKey = hex.decode("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d")

  // the layout is frozen - changing it would rotate every identity derived from a
  // namespaced VRF output, so these bytes are asserted exactly
  it("builds the frozen effective context layout", () => {
    expect(hex.encode(substrateVrfContext())).toBe(
      `${hex.encode(new TextEncoder().encode("substrate-vrf"))}00000000`
    )
    expect(hex.encode(substrateVrfContext(new TextEncoder().encode("ctx")))).toBe(
      `${hex.encode(new TextEncoder().encode("substrate-vrf"))}03000000${hex.encode(new TextEncoder().encode("ctx"))}`
    )
  })

  it("signs and verifies within the namespace", () => {
    const ctx = new TextEncoder().encode("ctx")
    const sig = vrfSign(secretKey, MSG_SHORT, ctx)

    expect(sig.length).toBe(96)
    expect(vrfVerify(publicKey, MSG_SHORT, sig, ctx)).toBe(true)
    // deterministic output under the same caller context
    expect(hex.encode(vrfSign(secretKey, MSG_SHORT, ctx).subarray(0, 32))).toBe(
      hex.encode(sig.subarray(0, 32))
    )
    // caller contexts still domain-separate each other
    expect(
      hex.encode(vrfSign(secretKey, MSG_SHORT, new TextEncoder().encode("ctx2")).subarray(0, 32))
    ).not.toBe(hex.encode(sig.subarray(0, 32)))
  })

  // the namespace exists so the wallet cannot act as a VRF oracle for other schnorrkel
  // protocols: signatures must not verify across the raw/namespaced boundary in either direction
  it("does not verify across the namespace boundary", () => {
    const ctx = new TextEncoder().encode("ctx")

    const namespaced = vrfSign(secretKey, MSG_SHORT, ctx)
    expect(vrfVerifySubstrate(publicKey, MSG_SHORT, namespaced, ctx)).toBe(false)

    const raw = vrfSignSubstrate(secretKey, MSG_SHORT, ctx)
    expect(vrfVerify(publicKey, MSG_SHORT, raw, ctx)).toBe(false)

    expect(hex.encode(namespaced.subarray(0, 32))).not.toBe(hex.encode(raw.subarray(0, 32)))
  })
})
