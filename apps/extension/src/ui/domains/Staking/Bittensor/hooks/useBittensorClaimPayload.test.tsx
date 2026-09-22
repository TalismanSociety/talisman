import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useBittensorClaimPayload } from "./useBittensorClaimPayload"

const mockUseScaleApi = vi.fn()
const mockGetBittensorClaimPayload = vi.fn()

vi.mock("@ui/hooks/sapi/useScaleApi", () => ({
  useScaleApi: () => mockUseScaleApi(),
}))
vi.mock("@ui/domains/Staking/shared/useGetFeeEstimate", () => ({
  useGetFeeEstimate: () => ({ data: 1n, isLoading: false, error: null }),
}))
vi.mock("../utils/bittensorClaimTx", () => ({
  getBittensorClaimPayload: (...args: unknown[]) => mockGetBittensorClaimPayload(...args),
}))

const BLOCK_TIME_MS = 12_000
const sapi = { id: "sapi", getConstant: () => BigInt(BLOCK_TIME_MS / 2) }
const PAYLOAD_DATA = { payload: { method: "0x00" }, txMetadata: new Uint8Array() }

const renderPayload = (queryClient: QueryClient) => {
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(
    () =>
      useBittensorClaimPayload({
        networkId: "bittensor",
        address: "5FCollateral",
        hotkey: "5FValidator",
        enabled: true,
      }),
    { wrapper }
  )
}

describe("useBittensorClaimPayload", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    mockUseScaleApi.mockReset().mockReturnValue({ data: sapi, isLoading: false, isError: false })
    mockGetBittensorClaimPayload.mockReset().mockResolvedValue(PAYLOAD_DATA)
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  })

  afterEach(() => {
    queryClient.clear()
    vi.restoreAllMocks()
  })

  it("exposes the built payload while it is within its mortal era", async () => {
    const { result } = renderPayload(queryClient)

    await waitFor(() => expect(result.current.payload).toEqual(PAYLOAD_DATA.payload))
    expect(result.current.txMetadata).toBe(PAYLOAD_DATA.txMetadata)
    expect(result.current.isLoadingPayload).toBe(false)
  })

  it("withholds a payload that outlived its rebuild window until a fresh one lands", async () => {
    const { result, rerender } = renderPayload(queryClient)
    await waitFor(() => expect(result.current.payload).toEqual(PAYLOAD_DATA.payload))

    const builtAt = Date.now()
    vi.spyOn(Date, "now").mockReturnValue(builtAt + 33 * BLOCK_TIME_MS)
    rerender()

    expect(result.current.payload).toBeUndefined()
    expect(result.current.txMetadata).toBeUndefined()
    expect(result.current.isLoadingPayload).toBe(true)

    vi.restoreAllMocks()
    rerender()

    expect(result.current.payload).toEqual(PAYLOAD_DATA.payload)
  })
})
