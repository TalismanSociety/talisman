import type { Token } from "@talismn/chaindata-provider"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { TFunction } from "i18next"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useSwapAssets } from "../swaps.api"

const getFromAssetsMock = vi.fn()
const getToAssetsMock = vi.fn()

const mockUseTokensMap = vi.fn()
const mockUseRemoteConfig = vi.fn()

vi.mock("@ui/state/chaindata", () => ({
  useTokensMap: () => mockUseTokensMap(),
}))

vi.mock("@ui/state/remoteConfig", () => ({
  useRemoteConfig: () => mockUseRemoteConfig(),
}))

vi.mock("@ui/hooks/queryStoragePersister", () => ({
  createQueryStoragePersister: () => undefined,
  PERSIST_AGE_ONE_YEAR: 1000 * 60 * 60 * 24 * 365,
}))

vi.mock("../swap-services/useCoingeckoCategoryTokenIds", () => ({
  useCoingeckoCategoryTokenIds: () => ({ data: undefined, isLoading: false }),
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

const makeToken = (id: string, symbol: string) => ({ id, symbol, decimals: 18 }) as unknown as Token

const t = ((key: string) => key) as unknown as TFunction

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
    mockUseRemoteConfig.mockReturnValue({
      swaps: {
        curatedTokens: ["tok-b"],
      },
    })

    getFromAssetsMock.mockResolvedValue(["tok-a", "tok-b"])
    getToAssetsMock.mockResolvedValue(["tok-a", "tok-b"])
  })

  afterEach(() => {
    queryClient.clear()
  })

  it("does not refetch provider assets when token tab changes, while still filtering results", async () => {
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result, rerender } = renderHook(
      ({ tokenTab }: { tokenTab: string }) => useSwapAssets(null, tokenTab, t),
      {
        wrapper,
        initialProps: { tokenTab: "all" },
      }
    )

    await waitFor(() => expect(result.current.isLoadingFromAssets).toBe(false))
    await waitFor(() => expect(result.current.isLoadingToAssets).toBe(false))
    await waitFor(() => expect(result.current.fromAssetIds).toEqual(["tok-b", "tok-a"]))
    await waitFor(() => expect(result.current.toAssetIds).toEqual(["tok-b", "tok-a"]))

    const fromCallsBeforeTabChange = getFromAssetsMock.mock.calls.length
    const toCallsBeforeTabChange = getToAssetsMock.mock.calls.length

    rerender({ tokenTab: "popular" })

    await waitFor(() => expect(result.current.fromAssetIds).toEqual(["tok-b"]))
    await waitFor(() => expect(result.current.toAssetIds).toEqual(["tok-b"]))

    expect(getFromAssetsMock).toHaveBeenCalledTimes(fromCallsBeforeTabChange)
    expect(getToAssetsMock).toHaveBeenCalledTimes(toCallsBeforeTabChange)
  })
})
