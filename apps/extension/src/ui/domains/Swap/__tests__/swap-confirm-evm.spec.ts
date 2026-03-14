import { act, renderHook } from "@testing-library/react"
import { isUserRejectionError } from "@ui/util/isUserRejectionError"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Module mocks for useSwapPostSubmit ──────────────────────────────

const mockSetActiveNetwork = vi.fn()
const mockSetActiveToken = vi.fn()
const mockSaveIdForMonitoring = vi.fn()

vi.mock("@core/domains/balances/store.activeNetworks", () => ({
  activeNetworksStore: { setActive: (...args: unknown[]) => mockSetActiveNetwork(...args) },
}))

vi.mock("@core/domains/balances/store.activeTokens", () => ({
  activeTokensStore: { setActive: (...args: unknown[]) => mockSetActiveToken(...args) },
}))

vi.mock("../swap-modules/simpleswap-swap-module", () => ({
  saveIdForMonitoring: (...args: unknown[]) => mockSaveIdForMonitoring(...args),
}))

import { useConfirmReadiness, useSwapPostSubmit, useSwapTxInfo } from "../hooks/useSwapConfirmation"

// ── isUserRejectionError ────────────────────────────────────────────

describe("isUserRejectionError", () => {
  it("returns false for null / undefined / non-object", () => {
    expect(isUserRejectionError(null)).toBe(false)
    expect(isUserRejectionError(undefined)).toBe(false)
    expect(isUserRejectionError("string")).toBe(false)
    expect(isUserRejectionError(42)).toBe(false)
    expect(isUserRejectionError(true)).toBe(false)
  })

  describe("EIP-1193 code 4001", () => {
    it("detects numeric code 4001", () => {
      expect(isUserRejectionError({ code: 4001 })).toBe(true)
    })

    it("does not match similar numeric codes", () => {
      expect(isUserRejectionError({ code: 4002 })).toBe(false)
      expect(isUserRejectionError({ code: -32603 })).toBe(false)
    })
  })

  describe("ethers.js ACTION_REJECTED", () => {
    it("detects string code ACTION_REJECTED", () => {
      expect(isUserRejectionError({ code: "ACTION_REJECTED" })).toBe(true)
    })

    it("does not match other string codes", () => {
      expect(isUserRejectionError({ code: "CALL_EXCEPTION" })).toBe(false)
    })
  })

  describe("message-based detection", () => {
    it.each([
      "User cancelled the request",
      "Request was cancelled by the user",
      "CANCELLED",
      "Transaction rejected by user",
      "User rejected the request",
      "MetaMask Tx Signature: User denied transaction signature",
      "User denied transaction signature",
      "The request was denied by the user",
    ])("detects rejection message: %s", (message) => {
      expect(isUserRejectionError({ message })).toBe(true)
    })

    it("is case-insensitive", () => {
      expect(isUserRejectionError({ message: "REJECTED" })).toBe(true)
      expect(isUserRejectionError({ message: "Cancelled" })).toBe(true)
      expect(isUserRejectionError({ message: "DENIED" })).toBe(true)
    })

    it("returns false for unrelated error messages", () => {
      expect(isUserRejectionError({ message: "insufficient funds" })).toBe(false)
      expect(isUserRejectionError({ message: "nonce too low" })).toBe(false)
      expect(isUserRejectionError({ message: "execution reverted" })).toBe(false)
      expect(isUserRejectionError({ message: "gas required exceeds allowance" })).toBe(false)
    })

    it("returns false when message is not a string", () => {
      expect(isUserRejectionError({ message: 123 })).toBe(false)
      expect(isUserRejectionError({ message: null })).toBe(false)
    })
  })

  describe("code takes precedence over message", () => {
    it("returns true for code 4001 even if message is unrelated", () => {
      expect(isUserRejectionError({ code: 4001, message: "insufficient funds" })).toBe(true)
    })

    it("returns true for ACTION_REJECTED even if message is unrelated", () => {
      expect(isUserRejectionError({ code: "ACTION_REJECTED", message: "execution reverted" })).toBe(
        true
      )
    })
  })

  describe("empty / missing fields", () => {
    it("returns false for empty object", () => {
      expect(isUserRejectionError({})).toBe(false)
    })

    it("returns false for object with unrelated fields", () => {
      expect(isUserRejectionError({ foo: "bar" })).toBe(false)
    })

    it("returns false for an Error with no message content", () => {
      expect(isUserRejectionError({ message: "" })).toBe(false)
    })
  })
})

// ── useConfirmReadiness ─────────────────────────────────────────────

describe("useConfirmReadiness", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts as not ready when swapView is 'confirm'", () => {
    const { result } = renderHook(() => useConfirmReadiness("confirm"))
    expect(result.current).toBe(false)
  })

  it("becomes ready after 1 second in confirm view", () => {
    const { result } = renderHook(() => useConfirmReadiness("confirm"))

    act(() => {
      vi.advanceTimersByTime(999)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })

  it("stays not ready for non-confirm views", () => {
    const { result } = renderHook(() => useConfirmReadiness("details"))

    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current).toBe(false)
  })

  it("resets when leaving confirm view", () => {
    const { result, rerender } = renderHook(({ view }) => useConfirmReadiness(view), {
      initialProps: { view: "confirm" },
    })

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current).toBe(true)

    rerender({ view: "details" })
    expect(result.current).toBe(false)
  })

  it("restarts the timer when re-entering confirm view", () => {
    const { result, rerender } = renderHook(({ view }) => useConfirmReadiness(view), {
      initialProps: { view: "confirm" },
    })

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current).toBe(true)

    rerender({ view: "details" })
    rerender({ view: "confirm" })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(result.current).toBe(true)
  })
})

// ── useSwapTxInfo ───────────────────────────────────────────────────

describe("useSwapTxInfo", () => {
  const baseParams = {
    fromTokenId: "eth-erc20-usdc",
    toTokenId: "eth-erc20-dai",
    fromAmount: 1000000n,
    toAmount: 999000n,
    toAddress: "0x1234567890abcdef1234567890abcdef12345678",
  }

  describe("simpleswap protocol", () => {
    it("returns swap-simpleswap tx info when all params are present", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          exchange: { id: "exchange-123" },
          protocol: "simpleswap",
        })
      )

      expect(result.current).toEqual({
        type: "swap-simpleswap",
        exchangeId: "exchange-123",
        fromTokenId: baseParams.fromTokenId,
        toTokenId: baseParams.toTokenId,
        fromAmount: "1000000",
        toAmount: "999000",
        to: baseParams.toAddress,
      })
    })

    it("returns undefined when exchange is missing", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          exchange: undefined,
          protocol: "simpleswap",
        })
      )

      expect(result.current).toBeUndefined()
    })
  })

  describe("stealthex protocol", () => {
    it("returns swap-stealthex tx info when all params are present", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          exchange: { id: "stealthex-456" },
          protocol: "stealthex",
        })
      )

      expect(result.current).toEqual({
        type: "swap-stealthex",
        exchangeId: "stealthex-456",
        fromTokenId: baseParams.fromTokenId,
        toTokenId: baseParams.toTokenId,
        fromAmount: "1000000",
        toAmount: "999000",
        to: baseParams.toAddress,
      })
    })

    it("returns undefined when exchange is missing", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          exchange: undefined,
          protocol: "stealthex",
        })
      )

      expect(result.current).toBeUndefined()
    })
  })

  describe("lifi protocol", () => {
    it("returns swap-lifi tx info with subProtocol", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          exchange: { id: "lifi-789" },
          protocol: "lifi",
          subProtocol: "uniswap-v3",
        })
      )

      expect(result.current).toEqual({
        type: "swap-lifi",
        protocolName: "uniswap-v3",
        fromTokenId: baseParams.fromTokenId,
        toTokenId: baseParams.toTokenId,
        fromAmount: "1000000",
        toAmount: "999000",
        to: baseParams.toAddress,
        fromLifiChainId: undefined,
        toLifiChainId: undefined,
      })
    })

    it("returns undefined when subProtocol is missing", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          exchange: { id: "lifi-789" },
          protocol: "lifi",
        })
      )

      expect(result.current).toBeUndefined()
    })
  })

  describe("missing required params", () => {
    it("returns undefined when fromTokenId is null", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          fromTokenId: null,
          exchange: { id: "x" },
          protocol: "simpleswap",
        })
      )
      expect(result.current).toBeUndefined()
    })

    it("returns undefined when toTokenId is null", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          toTokenId: null,
          exchange: { id: "x" },
          protocol: "simpleswap",
        })
      )
      expect(result.current).toBeUndefined()
    })

    it("returns undefined when fromAmount is null", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          fromAmount: null,
          exchange: { id: "x" },
          protocol: "simpleswap",
        })
      )
      expect(result.current).toBeUndefined()
    })

    it("returns undefined when toAmount is null", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          toAmount: null,
          exchange: { id: "x" },
          protocol: "simpleswap",
        })
      )
      expect(result.current).toBeUndefined()
    })

    it("returns undefined when toAddress is null", () => {
      const { result } = renderHook(() =>
        useSwapTxInfo({
          ...baseParams,
          toAddress: null,
          exchange: { id: "x" },
          protocol: "simpleswap",
        })
      )
      expect(result.current).toBeUndefined()
    })
  })

  describe("unsupported protocol", () => {
    it("throws for an unknown protocol when all params present", () => {
      // Suppress React's console.error for the expected render-phase throw
      const spy = vi.spyOn(console, "error").mockImplementation(() => {})
      try {
        expect(() =>
          renderHook(() =>
            useSwapTxInfo({
              ...baseParams,
              exchange: { id: "x" },
              protocol: "unknown-protocol",
            })
          )
        ).toThrow("swapModule unknown-protocol not supported")
      } finally {
        spy.mockRestore()
      }
    })
  })

  describe("memoization", () => {
    it("returns the same reference when inputs are unchanged", () => {
      const props = {
        ...baseParams,
        exchange: { id: "ex-1" },
        protocol: "simpleswap" as const,
      }
      const { result, rerender } = renderHook(() => useSwapTxInfo(props))

      const first = result.current
      rerender()
      expect(result.current).toBe(first)
    })
  })
})

// ── useSwapPostSubmit ───────────────────────────────────────────────

describe("useSwapPostSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("activates networks and tokens, then navigates on submit", () => {
    const gotoSubmitted = vi.fn()
    const txInfo = {
      type: "swap-lifi" as const,
      protocolName: "uniswap-v3",
      fromTokenId: "eth-erc20-usdc",
      toTokenId: "eth-erc20-dai",
      fromAmount: "1000000",
      toAmount: "999000",
      to: "0xabc",
    }

    const { result } = renderHook(() =>
      useSwapPostSubmit({
        fromNetworkId: "1",
        toNetworkId: "137",
        toTokenId: "polygon-erc20-dai",
        txInfo,
        gotoSubmitted,
      })
    )

    act(() => {
      result.current("0xhash123")
    })

    expect(mockSetActiveNetwork).toHaveBeenCalledWith("137", true)
    expect(mockSetActiveToken).toHaveBeenCalledWith("polygon-erc20-dai", true)
    expect(gotoSubmitted).toHaveBeenCalledWith({
      hash: "0xhash123",
      networkId: "1",
      txInfo,
    })
  })

  it("calls saveIdForMonitoring for simpleswap exchanges", () => {
    const gotoSubmitted = vi.fn()
    const txInfo = {
      type: "swap-simpleswap" as const,
      exchangeId: "swap-id-42",
      fromTokenId: "eth-erc20-usdc",
      toTokenId: "btc-native",
      fromAmount: "1000000",
      toAmount: "50000",
      to: "bc1q...",
    }

    const { result } = renderHook(() =>
      useSwapPostSubmit({
        fromNetworkId: "1",
        toNetworkId: "bitcoin",
        toTokenId: "btc-native",
        txInfo,
        gotoSubmitted,
      })
    )

    act(() => {
      result.current("0xtxhash")
    })

    expect(mockSaveIdForMonitoring).toHaveBeenCalledWith("swap-id-42", "0xtxhash")
  })

  it("does not call saveIdForMonitoring for non-simpleswap protocols", () => {
    const gotoSubmitted = vi.fn()
    const txInfo = {
      type: "swap-stealthex" as const,
      exchangeId: "stx-99",
      fromTokenId: "eth-erc20-usdc",
      toTokenId: "btc-native",
      fromAmount: "1000000",
      toAmount: "50000",
      to: "bc1q...",
    }

    const { result } = renderHook(() =>
      useSwapPostSubmit({
        fromNetworkId: "1",
        toNetworkId: null,
        toTokenId: null,
        txInfo,
        gotoSubmitted,
      })
    )

    act(() => {
      result.current("0xhash")
    })

    expect(mockSaveIdForMonitoring).not.toHaveBeenCalled()
  })

  it("skips network activation when toNetworkId is null", () => {
    const gotoSubmitted = vi.fn()
    const txInfo = {
      type: "swap-lifi" as const,
      protocolName: "uniswap-v3",
      fromTokenId: "eth-erc20-usdc",
      toTokenId: "eth-erc20-dai",
      fromAmount: "1000000",
      toAmount: "999000",
      to: "0xabc",
    }

    const { result } = renderHook(() =>
      useSwapPostSubmit({
        fromNetworkId: "1",
        toNetworkId: null,
        toTokenId: null,
        txInfo,
        gotoSubmitted,
      })
    )

    act(() => {
      result.current("0xhash")
    })

    expect(mockSetActiveNetwork).not.toHaveBeenCalled()
    expect(mockSetActiveToken).not.toHaveBeenCalled()
  })

  it("does not navigate when fromNetworkId is null", () => {
    const gotoSubmitted = vi.fn()
    const txInfo = {
      type: "swap-lifi" as const,
      protocolName: "uniswap-v3",
      fromTokenId: "eth-erc20-usdc",
      toTokenId: "eth-erc20-dai",
      fromAmount: "1000000",
      toAmount: "999000",
      to: "0xabc",
    }

    const { result } = renderHook(() =>
      useSwapPostSubmit({
        fromNetworkId: null,
        toNetworkId: "137",
        toTokenId: "polygon-erc20-dai",
        txInfo,
        gotoSubmitted,
      })
    )

    act(() => {
      result.current("0xhash")
    })

    expect(gotoSubmitted).not.toHaveBeenCalled()
  })

  it("does not navigate when txInfo is undefined", () => {
    const gotoSubmitted = vi.fn()

    const { result } = renderHook(() =>
      useSwapPostSubmit({
        fromNetworkId: "1",
        toNetworkId: "137",
        toTokenId: "polygon-erc20-dai",
        txInfo: undefined,
        gotoSubmitted,
      })
    )

    act(() => {
      result.current("0xhash")
    })

    expect(gotoSubmitted).not.toHaveBeenCalled()
  })
})
