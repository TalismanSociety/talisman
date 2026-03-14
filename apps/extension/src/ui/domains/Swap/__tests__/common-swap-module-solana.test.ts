import { describe, expect, it } from "vitest"

import { getTokenIdForSwappableAsset } from "../swap-modules/common.swap-module"

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

describe("getTokenIdForSwappableAsset (solana)", () => {
  it("returns native token id when no contractAddress", () => {
    expect(getTokenIdForSwappableAsset("solana", "solana-mainnet")).toBe(
      "solana-mainnet:sol-native"
    )
  })

  it("returns SPL token id when contractAddress provided", () => {
    expect(getTokenIdForSwappableAsset("solana", "solana-mainnet", USDC_MINT)).toBe(
      `solana-mainnet:sol-spl:${USDC_MINT}`
    )
  })

  it("returns native token id when contractAddress is explicit undefined", () => {
    expect(getTokenIdForSwappableAsset("solana", "solana-mainnet", undefined)).toBe(
      "solana-mainnet:sol-native"
    )
  })
})
