import type { WalletTransactionInfo } from "@core/domains/transactions/types"
import { describe, expect, it } from "vitest"

import { withPricing } from "./withPricing"

const sentAtLow: WalletTransactionInfo = {
  type: "approve-erc20",
  tokenId: "10:evm-native",
  contractAddress: "0x9999999999999999999999999999999999999999",
  amount: "1",
  pricing: { priority: "low", estimatedFee: "100" },
}

describe("withPricing", () => {
  it("prices a speed-up at its own priority, not the one it replaces", () => {
    expect(
      withPricing(sentAtLow, { priority: "high", txDetails: { estimatedFee: 300n } as never })
        .pricing
    ).toEqual({ priority: "high", estimatedFee: "300" })
  })

  it("forgets the replaced pricing when the replacement's is unknown", () => {
    expect(withPricing(sentAtLow, { priority: undefined, txDetails: undefined }).pricing).toBe(
      undefined
    )
  })
})
