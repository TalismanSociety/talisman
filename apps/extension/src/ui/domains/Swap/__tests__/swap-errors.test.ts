import { describe, expect, it } from "vitest"

import {
  classifyFeeEstimationError,
  classifySwapError,
  getSwapErrorMessage,
  type SwapConfirmError,
} from "../swap-errors"

const mockT = ((key: string, opts?: Record<string, string>) => {
  if (!opts) return key
  return Object.entries(opts).reduce((s, [k, v]) => s.replace(`{{${k}}}`, v), key)
}) as unknown as Parameters<typeof getSwapErrorMessage>[1]

describe("classifySwapError", () => {
  it("returns null for falsy input", () => {
    expect(classifySwapError(null)).toBeNull()
    expect(classifySwapError(undefined)).toBeNull()
  })

  it("returns null for abort errors", () => {
    expect(classifySwapError(new DOMException("Aborted", "AbortError"))).toBeNull()
    expect(classifySwapError(new Error("Aborted"))).toBeNull()
  })

  it("detects stale quote errors", () => {
    expect(classifySwapError(new Error("Please select the quote again"))).toEqual({
      type: "quote-stale",
    })
    expect(classifySwapError(new Error("Quote has expired"))).toEqual({ type: "quote-stale" })
  })

  it("falls back to transaction-craft-error", () => {
    const result = classifySwapError(new Error("Network not supported"))
    expect(result).toEqual({ type: "transaction-craft-error", message: "Network not supported" })
  })

  it("prefers shortMessage on viem-like errors", () => {
    const viemError = { shortMessage: "Execution reverted", message: "long details..." }
    const result = classifySwapError(viemError)
    expect(result).toEqual({ type: "transaction-craft-error", message: "Execution reverted" })
  })
})

describe("classifyFeeEstimationError", () => {
  it("returns null for falsy input", () => {
    expect(classifyFeeEstimationError(null)).toBeNull()
  })

  it("returns null for abort errors", () => {
    expect(classifyFeeEstimationError(new Error("Aborted"))).toBeNull()
  })

  it("classifies as transaction-likely-to-fail", () => {
    const result = classifyFeeEstimationError(new Error("Gas estimation failed"))
    expect(result).toEqual({
      type: "transaction-likely-to-fail",
      message: "Gas estimation failed",
    })
  })
})

describe("getSwapErrorMessage", () => {
  it("formats insufficient-swap-balance with symbol", () => {
    const error: SwapConfirmError = { type: "insufficient-swap-balance", tokenId: "sol-native" }
    const msg = getSwapErrorMessage(error, mockT, { tokenSymbol: "SOL" })
    expect(msg).toBe("Insufficient SOL balance")
  })

  it("formats insufficient-swap-balance without symbol", () => {
    const error: SwapConfirmError = { type: "insufficient-swap-balance", tokenId: "sol-native" }
    const msg = getSwapErrorMessage(error, mockT)
    expect(msg).toBe("Insufficient balance")
  })

  it("formats insufficient-fee-balance with symbol", () => {
    const error: SwapConfirmError = {
      type: "insufficient-fee-balance",
      feeTokenId: "sol-native",
      required: 5000n,
      available: 1000n,
    }
    const msg = getSwapErrorMessage(error, mockT, { feeTokenSymbol: "SOL" })
    expect(msg).toBe("Insufficient SOL to pay for transaction fees")
  })

  it("formats insufficient-fee-balance without symbol", () => {
    const error: SwapConfirmError = {
      type: "insufficient-fee-balance",
      feeTokenId: "sol-native",
      required: 5000n,
      available: 1000n,
    }
    const msg = getSwapErrorMessage(error, mockT)
    expect(msg).toBe("Insufficient balance to pay for transaction fees")
  })

  it("formats transaction-craft-error", () => {
    const error: SwapConfirmError = {
      type: "transaction-craft-error",
      message: "Network not supported",
    }
    expect(getSwapErrorMessage(error, mockT)).toBe("Network not supported")
  })

  it("formats transaction-likely-to-fail", () => {
    const error: SwapConfirmError = {
      type: "transaction-likely-to-fail",
      message: "Gas estimation failed",
    }
    expect(getSwapErrorMessage(error, mockT)).toBe(
      "Transaction is likely to fail: Gas estimation failed"
    )
  })

  it("formats quote-stale", () => {
    const error: SwapConfirmError = { type: "quote-stale" }
    expect(getSwapErrorMessage(error, mockT)).toBe(
      "Quote has expired. Please go back and get a new quote."
    )
  })
})
