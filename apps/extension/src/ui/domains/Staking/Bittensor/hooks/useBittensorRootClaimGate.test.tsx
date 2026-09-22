import type { DTaoClaimTarget } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { BittensorBasketClaimPreview } from "../utils/claimGate"
import { useBittensorRootClaimGate } from "./useBittensorRootClaimGate"

const mockUseBittensorBasketClaimPreview = vi.fn()

vi.mock("@ui/state/accounts", () => ({
  useAccountByAddress: (address: string) => ({ address }),
}))
vi.mock("./useBittensorClaimablePlancks", () => ({
  useBittensorClaimablePlancks: () => 90n,
}))
vi.mock("./useSubtensorStorageBigInt", () => ({
  useSubtensorStorageBigInt: () => ({ data: 0n, isSuccess: true, isFetchedAfterMount: true }),
}))
vi.mock("./useBittensorBasketClaimPreview", () => ({
  useBittensorBasketClaimPreview: () => mockUseBittensorBasketClaimPreview(),
}))

const TARGET: DTaoClaimTarget = {
  networkId: "bittensor",
  address: "5FCollateral",
  hotkey: "5FValidator",
}

const PREVIEW: BittensorBasketClaimPreview = {
  hotkey: TARGET.hotkey,
  accrued_tao: 100n,
  redeemable_tao: 90n,
  forfeited_tao_est: 10n,
}

const sapi = { id: "sapi", getConstant: () => 6_000n } as unknown as ScaleApi

describe("useBittensorRootClaimGate", () => {
  beforeEach(() => {
    mockUseBittensorBasketClaimPreview.mockReset()
  })

  it("submits once the claim preview was fetched on this mount", () => {
    mockUseBittensorBasketClaimPreview.mockReturnValue({
      data: PREVIEW,
      isSuccess: true,
      isFetchedAfterMount: true,
    })

    const { result } = renderHook(() => useBittensorRootClaimGate(sapi, TARGET))

    expect(result.current.canSubmit).toBe(true)
    expect(result.current.claimablePlancks).toBe(90n)
  })

  it("stays closed on a preview cached from a previous mount until the refetch lands", () => {
    mockUseBittensorBasketClaimPreview.mockReturnValue({
      data: PREVIEW,
      isSuccess: true,
      isFetchedAfterMount: false,
    })

    const { result } = renderHook(() => useBittensorRootClaimGate(sapi, TARGET))

    expect(result.current.canSubmit).toBe(false)
    expect(result.current.isClaimUnavailable).toBe(false)
    expect(result.current.claimablePlancks).toBe(90n)
  })
})
