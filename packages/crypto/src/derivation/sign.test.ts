import { ed25519 } from "@noble/curves/ed25519.js"
import { secp256k1 } from "@noble/curves/secp256k1.js"
import { sha256 } from "@noble/hashes/sha2.js"
import { sign as sr25519Sign, verify as sr25519Verify } from "@scure/sr25519"
import { describe, expect, it } from "vitest"
import { entropyToSeed, mnemonicToEntropy } from "../mnemonic"
import type { KeypairCurve } from "../types"
import { deriveKeypair } from "."

// Derivation KATs (derive.test.ts) prove the public key / address is byte-identical, but a
// derived secret key can be address-correct yet unable to produce valid signatures — e.g. an
// sr25519 secret key is 64 bytes (scalar + nonce) and only the scalar half feeds the address,
// so a regression in the nonce half (or any secret-key format change) would slip past the
// address KATs. These round-trips sign with each derived secret key and verify against the
// derived public key, covering the actual fund-loss operation.

const POLKADOT_MNEMONIC = "bottom drive obey lake curtain smoke basket hold race lonely fit walk"
const ETH_MNEMONIC = "test test test test test test test test test test test junk"
const ALICE_DP = "//Alice"
const ETH_DP = "m/44'/60'/0'/0/0"
const SOLANA_DP = "m/44'/501'/0'/0'"

const MESSAGE = new TextEncoder().encode("talisman sign+verify regression vector")
const TAMPERED = new TextEncoder().encode("talisman sign+verify regression vectoR")

const derive = async (mnemonic: string, path: string, curve: KeypairCurve) => {
  const seed = await entropyToSeed(mnemonicToEntropy(mnemonic), curve)
  return deriveKeypair(seed, path, curve)
}

describe("sign + verify with derived keys", () => {
  it("sr25519 (hard)", async () => {
    const { secretKey, publicKey } = await derive(POLKADOT_MNEMONIC, ALICE_DP, "sr25519")
    const sig = sr25519Sign(secretKey, MESSAGE)
    expect(sr25519Verify(MESSAGE, sig, publicKey)).toBe(true)
    expect(sr25519Verify(TAMPERED, sig, publicKey)).toBe(false)
  })

  it("sr25519 (soft) — exercises the 64-byte secret produced via HDKD.secretSoft", async () => {
    const { secretKey, publicKey } = await derive(POLKADOT_MNEMONIC, "//Alice/stash", "sr25519")
    const sig = sr25519Sign(secretKey, MESSAGE)
    expect(sr25519Verify(MESSAGE, sig, publicKey)).toBe(true)
    expect(sr25519Verify(TAMPERED, sig, publicKey)).toBe(false)
  })

  it("ed25519", async () => {
    const { secretKey, publicKey } = await derive(POLKADOT_MNEMONIC, ALICE_DP, "ed25519")
    // substrate ed25519 secret keys are stored as [seed(32) || publicKey(32)]; noble signs from the 32-byte seed
    const seed = secretKey.length === 64 ? secretKey.slice(0, 32) : secretKey
    const sig = ed25519.sign(MESSAGE, seed)
    expect(ed25519.verify(sig, MESSAGE, publicKey)).toBe(true)
    expect(ed25519.verify(sig, TAMPERED, publicKey)).toBe(false)
  })

  it("ecdsa (secp256k1)", async () => {
    const { secretKey, publicKey } = await derive(POLKADOT_MNEMONIC, ALICE_DP, "ecdsa")
    const digest = sha256(MESSAGE)
    const sig = secp256k1.sign(digest, secretKey)
    expect(secp256k1.verify(sig, digest, publicKey)).toBe(true)
    expect(secp256k1.verify(sig, sha256(TAMPERED), publicKey)).toBe(false)
  })

  it("ethereum (secp256k1)", async () => {
    const { secretKey, publicKey } = await derive(ETH_MNEMONIC, ETH_DP, "ethereum")
    const digest = sha256(MESSAGE)
    const sig = secp256k1.sign(digest, secretKey)
    expect(secp256k1.verify(sig, digest, publicKey)).toBe(true)
    expect(secp256k1.verify(sig, sha256(TAMPERED), publicKey)).toBe(false)
  })

  it("solana (ed25519)", async () => {
    const { secretKey, publicKey } = await derive(ETH_MNEMONIC, SOLANA_DP, "solana")
    const seed = secretKey.length === 64 ? secretKey.slice(0, 32) : secretKey
    const sig = ed25519.sign(MESSAGE, seed)
    expect(ed25519.verify(sig, MESSAGE, publicKey)).toBe(true)
    expect(ed25519.verify(sig, TAMPERED, publicKey)).toBe(false)
  })
})
