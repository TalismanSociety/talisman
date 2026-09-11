import type { Token } from "@talismn/chaindata-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSwapAssets } from "../swaps.api"

const getFromAssetsMock = vi.fn()
const getToAssetsMock = vi.fn()

const mockUseTokensMap = vi.fn()
const mockUseFeatureFlag = vi.fn()

vi.mock("@ui/state/remoteConfig", () => ({
  useFeatureFlag: (flag: string) => mockUseFeatureFlag(flag),
}))

vi.mock("@ui/state/chaindata", () => ({
  useTokensMap: () => mockUseTokensMap(),
}))

vi.mock("@ui/state/transactions", () => ({
  useTransactions: () => [],
}))

vi.mock("@ui/hooks/queryStoragePersister", () => ({
  createQueryStoragePersister: () => undefined,
  PERSIST_AGE_ONE_YEAR: 1000 * 60 * 60 * 24 * 365,
}))

vi.mock("../swap-modules/lifi-swap-module", () => ({
  lifiSwapModule: {
    protocol: "lifi",
    getFromAssets: (signal: AbortSignal) => getFromAssetsMock("lifi", signal),
    getToAssets: (fromTokenId: string | null, signal: AbortSignal) =>
      getToAssetsMock("lifi", fromTokenId, signal),
  },
}))

vi.mock("../swap-modules/simpleswap-swap-module", () => ({
  simpleswapSwapModule: {
    protocol: "simpleswap",
    getFromAssets: (signal: AbortSignal) => getFromAssetsMock("simpleswap", signal),
    getToAssets: (fromTokenId: string | null, signal: AbortSignal) =>
      getToAssetsMock("simpleswap", fromTokenId, signal),
  },
}))

vi.mock("../swap-modules/stealthex-swap-module", () => ({
  stealthexSwapModule: {
    protocol: "stealthex",
    getFromAssets: (signal: AbortSignal) => getFromAssetsMock("stealthex", signal),
    getToAssets: (fromTokenId: string | null, signal: AbortSignal) =>
      getToAssetsMock("stealthex", fromTokenId, signal),
  },
}))

vi.mock("../swap-modules/forevermoney-swap-module", () => ({
  forevermoneySwapModule: {
    protocol: "forevermoney",
    getFromAssets: (signal: AbortSignal) => getFromAssetsMock("forevermoney", signal),
    getToAssets: (fromTokenId: string | null, signal: AbortSignal) =>
      getToAssetsMock("forevermoney", fromTokenId, signal),
  },
}))

const makeToken = (id: string, symbol: string) => ({ id, symbol, decimals: 18 }) as unknown as Token

describe("useSwapAssets", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()

    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    })

    mockUseTokensMap.mockReturnValue({
      "tok-a": makeToken("tok-a", "AAA"),
      "tok-b": makeToken("tok-b", "BBB"),
    })

    getFromAssetsMock.mockResolvedValue(["tok-a", "tok-b"])
    getToAssetsMock.mockResolvedValue(["tok-a", "tok-b"])
    mockUseFeatureFlag.mockReturnValue(true)
  })

  afterEach(() => {
    queryClient.clear()
  })

  it("returns all asset ids without tab filtering", async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSwapAssets(null), {
      wrapper,
    })

    await waitFor(() => expect(result.current.isLoadingFromAssets).toBe(false))
    await waitFor(() => expect(result.current.isLoadingToAssets).toBe(false))
    await waitFor(() => expect(result.current.fromAssetIds).toEqual(["tok-a", "tok-b"]))
    await waitFor(() => expect(result.current.toAssetIds).toEqual(["tok-a", "tok-b"]))
  })

  it("queries the forevermoney module only when its feature flag is enabled", async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    mockUseFeatureFlag.mockReturnValue(false)

    const { result } = renderHook(() => useSwapAssets(null), { wrapper })

    await waitFor(() => expect(result.current.isLoadingFromAssets).toBe(false))
    expect(mockUseFeatureFlag).toHaveBeenCalledWith("SWAPS_FOREVERMONEY_TAO_BRIDGE")
    expect(getFromAssetsMock).not.toHaveBeenCalledWith("forevermoney", expect.anything())
    expect(getFromAssetsMock).toHaveBeenCalledWith("lifi", expect.anything())
  })

  it("queries the forevermoney module when its feature flag is enabled", async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSwapAssets(null), { wrapper })

    await waitFor(() => expect(result.current.isLoadingFromAssets).toBe(false))
    expect(getFromAssetsMock).toHaveBeenCalledWith("forevermoney", expect.anything())
  })
})
