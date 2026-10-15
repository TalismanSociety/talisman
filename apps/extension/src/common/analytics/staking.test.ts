import { describe, expect, it } from "vitest"

import { yieldIdForAnalytics } from "./staking"

describe("yieldIdForAnalytics", () => {
  it("keeps a product id", () => {
    expect(yieldIdForAnalytics("ethereum-eth-lido-staking")).toBe("ethereum-eth-lido-staking")
  })

  it("drops an id that embeds a contract or mint address", () => {
    expect(
      yieldIdForAnalytics("base-usdc-0x7bfa7c4f149e7415b73bdedfe609237e29cbf34a-4626-vault")
    ).toBeNull()
    expect(
      yieldIdForAnalytics("solana-jitosol-J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn-staking")
    ).toBeNull()
    expect(yieldIdForAnalytics(undefined)).toBeNull()
  })
})
