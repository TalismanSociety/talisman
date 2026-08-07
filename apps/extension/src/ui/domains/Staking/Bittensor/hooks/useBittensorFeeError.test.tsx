import type { Balances } from "@talismn/balances"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const useExistentialDepositMock = vi.fn()

vi.mock("@ui/hooks/useExistentialDeposit", () => ({
  useExistentialDeposit: (...args: unknown[]) => useExistentialDepositMock(...args),
}))

import { useBittensorFeeError } from "./useBittensorFeeError"

const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
const FEE_TOKEN_ID = "bittensor-substrate-native"

const balancesWithTransferable = (transferable: bigint) =>
  ({
    each: [
      {
        tokenId: FEE_TOKEN_ID,
        address: ADDRESS,
        transferable: { planck: transferable },
      },
    ],
  }) as unknown as Balances

describe("useBittensorFeeError", () => {
  beforeEach(() => {
    useExistentialDepositMock.mockReset()
    useExistentialDepositMock.mockReturnValue({ planck: 500n })
  })

  it("errors when the transferable balance cannot cover the fee", () => {
    const { result } = renderHook(() =>
      useBittensorFeeError({
        allBalances: balancesWithTransferable(99n),
        address: ADDRESS,
        feeEstimate: 100n,
        feeTokenId: FEE_TOKEN_ID,
      })
    )

    expect(result.current).toBe("Insufficient TAO to cover fee")
  })

  it("errors when the account has no balance for the fee token", () => {
    const { result } = renderHook(() =>
      useBittensorFeeError({
        allBalances: { each: [] } as unknown as Balances,
        address: ADDRESS,
        feeEstimate: 100n,
        feeTokenId: FEE_TOKEN_ID,
      })
    )

    expect(result.current).toBe("Insufficient TAO to cover fee")
  })

  it("errors when paying the fee would drop the account below the existential deposit", () => {
    const { result } = renderHook(() =>
      useBittensorFeeError({
        allBalances: balancesWithTransferable(300n),
        address: ADDRESS,
        feeEstimate: 100n,
        feeTokenId: FEE_TOKEN_ID,
      })
    )

    expect(result.current).toBe("Insufficient TAO to cover fee and keep account alive")
  })

  it("returns null when the balance covers the fee and the existential deposit", () => {
    const { result } = renderHook(() =>
      useBittensorFeeError({
        allBalances: balancesWithTransferable(600n),
        address: ADDRESS,
        feeEstimate: 100n,
        feeTokenId: FEE_TOKEN_ID,
      })
    )

    expect(result.current).toBeNull()
  })

  it("returns null while the fee estimate is not resolved yet", () => {
    const { result } = renderHook(() =>
      useBittensorFeeError({
        allBalances: balancesWithTransferable(0n),
        address: ADDRESS,
        feeEstimate: undefined,
        feeTokenId: FEE_TOKEN_ID,
      })
    )

    expect(result.current).toBeNull()
  })
})
