import { ALPHA_PRICE_SCALE } from "@talismn/balances"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const getRuntimeCallValueMock = vi.fn()
const useScaleApiMock = vi.fn()

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: (...args: unknown[]) => useScaleApiMock(...args),
}))

import { useBittensorAlphaPrice } from "./useBittensorAlphaPrice"

describe("useBittensorAlphaPrice", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    getRuntimeCallValueMock.mockReset()
    useScaleApiMock.mockReset()
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

  it("returns the unit alpha price for root without querying SAPI", async () => {
    useScaleApiMock.mockReturnValue({ data: undefined })

    const { result } = renderHook(
      () => useBittensorAlphaPrice({ networkId: undefined, netuid: 0 }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.data).toBe(ALPHA_PRICE_SCALE))
    expect(getRuntimeCallValueMock).not.toHaveBeenCalled()
  })

  it("fetches the runtime alpha price for non-root subnets", async () => {
    getRuntimeCallValueMock.mockResolvedValue(123n)
    useScaleApiMock.mockReturnValue({
      data: {
        id: "sapi",
        getRuntimeCallValue: getRuntimeCallValueMock,
      },
    })

    const { result } = renderHook(
      () => useBittensorAlphaPrice({ networkId: "bittensor", netuid: 1 }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.data).toBe(123n))
    expect(getRuntimeCallValueMock).toHaveBeenCalledWith(
      "SwapRuntimeApi",
      "current_alpha_price",
      [1]
    )
  })
})
