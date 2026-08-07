import type { DTaoClaimTarget } from "@talismn/balances"
import type { ScaleApi } from "@talismn/sapi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useBittensorBasketPayout } from "./useBittensorBasketPayout"

const TARGET: DTaoClaimTarget = {
  networkId: "bittensor",
  address: "5FCollateral",
  hotkey: "5FValidator",
}

const getRuntimeCallValueMock = vi.fn()
const mockSapi = () =>
  ({ id: "sapi", getRuntimeCallValue: getRuntimeCallValueMock }) as unknown as ScaleApi

describe("useBittensorBasketPayout", () => {
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

  it("reads the target pair's payout from the basket runtime api", async () => {
    getRuntimeCallValueMock.mockResolvedValue(100n)

    const { result } = renderHook(() => useBittensorBasketPayout(mockSapi(), TARGET), { wrapper })

    await waitFor(() => expect(result.current.data).toBe(100n))
    expect(getRuntimeCallValueMock).toHaveBeenCalledWith(
      "BetaBasketRuntimeApi",
      "get_basket_payout",
      [TARGET.hotkey, TARGET.address]
    )
  })

  it("stays disabled without a target", () => {
    const { result } = renderHook(() => useBittensorBasketPayout(mockSapi(), null), { wrapper })

    expect(result.current.isSuccess).toBe(false)
    expect(getRuntimeCallValueMock).not.toHaveBeenCalled()
  })

  it("drops isSuccess when a refetch errors, so the claim gate fails closed", async () => {
    getRuntimeCallValueMock.mockResolvedValueOnce(100n)

    const { result } = renderHook(() => useBittensorBasketPayout(mockSapi(), TARGET), { wrapper })
    await waitFor(() => expect(result.current.data).toBe(100n))
    expect(result.current.isSuccess).toBe(true)

    getRuntimeCallValueMock.mockRejectedValueOnce(new Error("rpc down"))
    await result.current.refetch()

    await waitFor(() => expect(result.current.isSuccess).toBe(false))
    expect(result.current.data).toBe(100n)
  })
})
