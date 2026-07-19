import { verify as sr25519Verify } from "@scure/sr25519"
import { describe, expect, it } from "vitest"

import { hex } from "../utils"
import { signSubstrate } from "."

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
