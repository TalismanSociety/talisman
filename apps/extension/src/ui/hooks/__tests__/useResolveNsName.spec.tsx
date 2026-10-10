import type { NsLookupType } from "@talismn/on-chain-id"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  resolveNames: vi.fn(),
}))

vi.mock("@ui/api", () => ({
  api: { accountsOnChainIdsResolveNames: mocks.resolveNames },
}))

const CACHE_KEY = "TalismanNsNamesCache"
const NAME = "alice.eth"
const ADDRESS = "0x0000000000000000000000000000000000000001"

type CacheEntry = [string, { result?: [string, NsLookupType] | null; updated?: number }]

const readCache = () => JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]") as CacheEntry[]

const expectCached = (entry: CacheEntry) => expect(readCache()).toEqual([entry])

// the cache is populated from local storage when the module loads, so it must be imported per test
const importHook = async () => (await import("../useResolveNsName")).useResolveNsName

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return Wrapper
}

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })

describe("useResolveNsName", () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    mocks.resolveNames.mockReset()
  })

  it("caches a resolved address", async () => {
    mocks.resolveNames.mockResolvedValue({ [NAME]: [ADDRESS, "ens"] })
    const useResolveNsName = await importHook()

    const { result } = renderHook(() => useResolveNsName(NAME), {
      wrapper: createWrapper(createQueryClient()),
    })

    await waitFor(() => expect(result.current[0]).toBe(ADDRESS))

    expect(mocks.resolveNames).toHaveBeenCalledWith([NAME])
    expectCached([NAME, { result: [ADDRESS, "ens"], updated: expect.any(Number) }])
  })

  it("caches the absence of a result", async () => {
    mocks.resolveNames.mockResolvedValue({ [NAME]: null })
    const useResolveNsName = await importHook()

    renderHook(() => useResolveNsName(NAME), { wrapper: createWrapper(createQueryClient()) })

    await waitFor(() => expectCached([NAME, { result: null, updated: expect.any(Number) }]))
  })

  it("replaces a cached result when the name no longer resolves", async () => {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify([[NAME, { result: [ADDRESS, "ens"], updated: Date.now() }]])
    )
    mocks.resolveNames.mockResolvedValue({ [NAME]: null })
    const useResolveNsName = await importHook()

    const { result } = renderHook(() => useResolveNsName(NAME), {
      wrapper: createWrapper(createQueryClient()),
    })

    // the cached address is served as initial data while the lookup runs again
    expect(result.current[0]).toBe(ADDRESS)

    await waitFor(() => expectCached([NAME, { result: null, updated: expect.any(Number) }]))
    expect(result.current[0]).toBeNull()
  })

  it("caches nothing for a name that isn't looked up", async () => {
    const useResolveNsName = await importHook()

    const { result } = renderHook(() => useResolveNsName("alice"), {
      wrapper: createWrapper(createQueryClient()),
    })

    await act(async () => {})

    expect(result.current[1].isNsLookup).toBe(false)
    expect(mocks.resolveNames).not.toHaveBeenCalled()
    expect(readCache()).toEqual([])
  })
})
