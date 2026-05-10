import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Mock useBalancesByParams to avoid needing the full extension context
const mockBalancesByParams = vi.fn()
vi.mock("@ui/hooks/useBalancesByParams", () => ({
  useBalancesByParams: (...args: unknown[]) => mockBalancesByParams(...args),
}))

import { Balances } from "@talismn/balances"
import { useFeeBalanceCheck } from "@ui/hooks/useFeeBalanceCheck"

const makeResult = (planck: bigint | null, status: "initialising" | "live" = "live") => {
  if (planck === null) {
    // No balance entry — simulates account with 0 of this token
    mockBalancesByParams.mockReturnValue({
      status,
      balances: new Balances([]),
    })
  } else {
    // Balance entry exists with given planck
    const mockBalance = {
      address: "0x123",
      tokenId: "sol-native",
      transferable: { planck },
    }
    const mockBalances = {
      find: () => ({ each: [mockBalance] }),
    }
    mockBalancesByParams.mockReturnValue({ status, balances: mockBalances })
  }
}

describe("useFeeBalanceCheck", () => {
  it('returns "unknown" when no feeTokenId', () => {
    makeResult(null)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: undefined,
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-spl-token",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("unknown")
  })

  it('returns "unknown" when no fromAddress', () => {
    makeResult(null)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: null,
        feeTokenId: "sol-native",
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-spl-token",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("unknown")
  })

  it('returns "loading" when fee is still loading', () => {
    makeResult(10_000_000n)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: null,
        isFeeLoading: true,
        fromTokenId: "sol-spl-token",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("loading")
  })

  it('returns "loading" when balance subscription is still initialising', () => {
    makeResult(null, "initialising")
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-spl-token",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("loading")
  })

  it('returns "insufficient" when subscription is live but no balance entry exists (0 balance)', () => {
    makeResult(null, "live")
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-spl-token",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("insufficient")
    expect(result.current.available).toBe(0n)
  })

  it('returns "sufficient" when non-native swap and enough fee balance', () => {
    makeResult(10_000_000n)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-spl-usdc",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("sufficient")
    expect(result.current.feeTokenId).toBe("sol-native")
  })

  it('returns "insufficient" when non-native swap and not enough fee balance', () => {
    makeResult(3000n)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-spl-usdc",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("insufficient")
    expect(result.current.required).toBe(5000n)
    expect(result.current.available).toBe(3000n)
  })

  it("accounts for fromAmount when swapping native token (fee token = swap token)", () => {
    // Swapping native SOL — both swap amount and fee come from the same pool
    makeResult(1_000_000n)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-native",
        fromAmount: 999_000n,
      })
    )
    // 999_000 + 5000 = 1_004_000 > 1_000_000 → insufficient
    expect(result.current.status).toBe("insufficient")
  })

  it('returns "sufficient" for native swap when balance covers amount + fee', () => {
    makeResult(2_000_000n)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: "5000",
        isFeeLoading: false,
        fromTokenId: "sol-native",
        fromAmount: 999_000n,
      })
    )
    // 999_000 + 5000 = 1_004_000 <= 2_000_000 → sufficient
    expect(result.current.status).toBe("sufficient")
  })

  it("accepts feePlanck as bigint", () => {
    makeResult(10_000n)
    const { result } = renderHook(() =>
      useFeeBalanceCheck({
        fromAddress: "0x123",
        feeTokenId: "sol-native",
        feePlanck: 5000n,
        isFeeLoading: false,
        fromTokenId: "sol-spl-usdc",
        fromAmount: 1_000_000n,
      })
    )
    expect(result.current.status).toBe("sufficient")
  })
})
