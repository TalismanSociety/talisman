import { describe, expect, it } from "vitest"

import type { Network } from "./chaindata"
import { isAccountPlatformCompatibleWithNetwork } from "./isAccountPlatformCompatibleWithNetwork"

const network = (fields: Record<string, unknown>) => fields as unknown as Network

describe("isAccountPlatformCompatibleWithNetwork", () => {
  it("matches ethereum, solana and bitcoin networks by platform", () => {
    expect(
      isAccountPlatformCompatibleWithNetwork(network({ platform: "ethereum" }), "ethereum")
    ).toBe(true)
    expect(
      isAccountPlatformCompatibleWithNetwork(network({ platform: "ethereum" }), "polkadot")
    ).toBe(false)
    expect(isAccountPlatformCompatibleWithNetwork(network({ platform: "solana" }), "solana")).toBe(
      true
    )
    expect(isAccountPlatformCompatibleWithNetwork(network({ platform: "solana" }), "bitcoin")).toBe(
      false
    )
    expect(
      isAccountPlatformCompatibleWithNetwork(network({ platform: "bitcoin" }), "bitcoin")
    ).toBe(true)
    expect(
      isAccountPlatformCompatibleWithNetwork(network({ platform: "bitcoin" }), "ethereum")
    ).toBe(false)
  })

  it("matches polkadot networks by account type", () => {
    const sr = network({ platform: "polkadot", account: "*25519" })
    const ecdsa = network({ platform: "polkadot", account: "secp256k1" })

    expect(isAccountPlatformCompatibleWithNetwork(sr, "polkadot")).toBe(true)
    expect(isAccountPlatformCompatibleWithNetwork(sr, "ethereum")).toBe(false)
    expect(isAccountPlatformCompatibleWithNetwork(ecdsa, "ethereum")).toBe(true)
    expect(isAccountPlatformCompatibleWithNetwork(ecdsa, "polkadot")).toBe(false)
  })

  it("throws on unknown account types and platforms", () => {
    expect(() =>
      isAccountPlatformCompatibleWithNetwork(
        network({ platform: "polkadot", account: "x" }),
        "polkadot"
      )
    ).toThrow("Unsupported polkadot network account type x")
    expect(() =>
      isAccountPlatformCompatibleWithNetwork(network({ platform: "cosmos" }), "polkadot")
    ).toThrow("Unsupported network platform")
  })
})
