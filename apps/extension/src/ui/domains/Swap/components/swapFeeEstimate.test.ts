import type { EthTransactionDetails } from "@core/domains/signing/types"
import { describe, expect, it } from "vitest"
import { hasEthFeeEstimateError } from "./swapFeeEstimate"

const sampleTxDetails: EthTransactionDetails = {
  evmNetworkId: "56",
  estimatedGas: 21000n,
  gasPrice: 1_000_000_000n,
  estimatedFee: 21_000_000_000_000n,
  estimatedL1DataFee: null,
  maxFee: 25_000_000_000_000n,
}

describe("hasEthFeeEstimateError", () => {
  it("returns true when exchange loading failed", () => {
    expect(
      hasEthFeeEstimateError({
        exchangeError: new Error("exchange failed"),
        ethError: undefined,
        txDetails: undefined,
      })
    ).toBe(true)
  })

  it("returns true when ethereum tx has error and no fee details", () => {
    expect(
      hasEthFeeEstimateError({
        exchangeError: undefined,
        ethError: new Error("tx invalid"),
        txDetails: undefined,
      })
    ).toBe(true)
  })

  it("returns false when fee details are available despite tx validation error", () => {
    expect(
      hasEthFeeEstimateError({
        exchangeError: undefined,
        ethError: new Error("insufficient BNB balance to pay for fee"),
        txDetails: sampleTxDetails,
      })
    ).toBe(false)
  })

  it("returns false when there is no exchange or ethereum error", () => {
    expect(
      hasEthFeeEstimateError({
        exchangeError: undefined,
        ethError: undefined,
        txDetails: sampleTxDetails,
      })
    ).toBe(false)
  })
})
