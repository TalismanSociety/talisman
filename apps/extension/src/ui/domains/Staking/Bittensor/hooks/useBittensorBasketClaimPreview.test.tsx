import type { DTaoClaimTarget } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { BittensorBasketClaimPreview } from "../utils/claimGate"
import { useBittensorBasketClaimPreview } from "./useBittensorBasketClaimPreview"

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

const getRuntimeCallValueMock = vi.fn()
const mockSapi = (isApiAvailable = true) =>
  ({
    id: "sapi",
    getRuntimeCallValue: getRuntimeCallValueMock,
    isApiAvailable: () => isApiAvailable,
  }) as unknown as ScaleApi

describe("useBittensorBasketClaimPreview", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    getRuntimeCallValueMock.mockReset()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it("reads the target pair's claim preview from the basket runtime api", async () => {
    getRuntimeCallValueMock.mockResolvedValue(PREVIEW)

    const { result } = renderHook(() => useBittensorBasketClaimPreview(mockSapi(), TARGET), {
      wrapper,
    })

    await waitFor(() => expect(result.current.data).toEqual(PREVIEW))
    expect(getRuntimeCallValueMock).toHaveBeenCalledWith(
      "BetaBasketRuntimeApi",
      "get_basket_claim_preview",
      [TARGET.hotkey, TARGET.address]
    )
  })

  it("resolves to null when the chain owes the pair nothing", async () => {
    getRuntimeCallValueMock.mockResolvedValue(undefined)

    const { result } = renderHook(() => useBittensorBasketClaimPreview(mockSapi(), TARGET), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
  })

  it("stays disabled without a target", () => {
    const { result } = renderHook(() => useBittensorBasketClaimPreview(mockSapi(), null), {
      wrapper,
    })

    expect(result.current.isSuccess).toBe(false)
    expect(getRuntimeCallValueMock).not.toHaveBeenCalled()
  })

  it("stays disabled on a runtime without the preview api, so the claim gate fails closed", () => {
    const { result } = renderHook(() => useBittensorBasketClaimPreview(mockSapi(false), TARGET), {
      wrapper,
    })

    expect(result.current.isSuccess).toBe(false)
    expect(getRuntimeCallValueMock).not.toHaveBeenCalled()
  })

  it("drops isSuccess when a refetch errors, so the claim gate fails closed", async () => {
    getRuntimeCallValueMock.mockResolvedValueOnce(PREVIEW)

    const { result } = renderHook(() => useBittensorBasketClaimPreview(mockSapi(), TARGET), {
      wrapper,
    })
    await waitFor(() => expect(result.current.data).toEqual(PREVIEW))
    expect(result.current.isSuccess).toBe(true)

    getRuntimeCallValueMock.mockRejectedValueOnce(new Error("rpc down"))
    await result.current.refetch()

    await waitFor(() => expect(result.current.isSuccess).toBe(false))
    expect(result.current.data).toEqual(PREVIEW)
  })
})
