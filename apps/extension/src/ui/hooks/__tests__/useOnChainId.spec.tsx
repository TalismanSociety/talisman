import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  lookupAddresses: vi.fn(),
}))

vi.mock("@ui/api", () => ({
  api: { accountsOnChainIdsLookupAddresses: mocks.lookupAddresses },
}))

const CACHE_KEY = "TalismanOnChainIdsCache"
const ADDRESS = "0x0000000000000000000000000000000000000001"

type CacheEntry = [string, { onChainId?: string | null; updated?: number }]

const readCache = () => JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]") as CacheEntry[]

const expectCached = (entry: CacheEntry) => expect(readCache()).toEqual([entry])

// the cache is populated from local storage when the module loads, so it must be imported per test
const importHook = async () => (await import("../useOnChainId")).useOnChainId

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe("useOnChainId", () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    mocks.lookupAddresses.mockReset()
  })

  it("caches an on-chain id", async () => {
    mocks.lookupAddresses.mockResolvedValue({ [ADDRESS]: "alice.eth" })
    const useOnChainId = await importHook()

    const { result } = renderHook(() => useOnChainId(ADDRESS), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current[0]).toBe("alice.eth"))

    expect(mocks.lookupAddresses).toHaveBeenCalledWith([ADDRESS])
    expectCached([ADDRESS, { onChainId: "alice.eth", updated: expect.any(Number) }])
  })

  it("caches the absence of an on-chain id", async () => {
    mocks.lookupAddresses.mockResolvedValue({})
    const useOnChainId = await importHook()

    const { result } = renderHook(() => useOnChainId(ADDRESS), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current[0]).toBeNull())

    expectCached([ADDRESS, { onChainId: null, updated: expect.any(Number) }])
  })

  it("replaces a cached on-chain id when a new lookup finds none", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify([[ADDRESS, { onChainId: "old.eth", updated: Date.now() }]])
    )
    mocks.lookupAddresses.mockResolvedValue({})
    const useOnChainId = await importHook()

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useOnChainId(ADDRESS), {
      wrapper: createWrapper(queryClient),
    })

    // the cached id is served as initial data, so nothing is looked up on mount
    expect(result.current[0]).toBe("old.eth")
    expect(mocks.lookupAddresses).not.toHaveBeenCalled()

    await queryClient.refetchQueries({ queryKey: ["useOnChainId", ADDRESS] })

    await waitFor(() => expect(result.current[0]).toBeNull())

    expectCached([ADDRESS, { onChainId: null, updated: expect.any(Number) }])
  })

  it("caches nothing when there is no address to look up", async () => {
    const useOnChainId = await importHook()

    const { result } = renderHook(() => useOnChainId(undefined), {
      wrapper: createWrapper(createQueryClient()),
    })

    await act(async () => {})

    expect(result.current[0]).toBeUndefined()
    expect(mocks.lookupAddresses).not.toHaveBeenCalled()
    expect(readCache()).toEqual([])
  })
})
