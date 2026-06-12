import { describe, expect, it, vi } from "vitest"

import { createEarnQueryCachePersister, getEarnQueryCacheKey } from "./earnQueryCache"

vi.mock("@ui/api/api", () => ({
  api: {
    queryCacheGet: vi.fn(),
    queryCacheSet: vi.fn(),
    queryCacheRemove: vi.fn(),
  },
}))

const { api } = await import("@ui/api/api")
const mockedApi = vi.mocked(api)

describe("getEarnQueryCacheKey", () => {
  it("builds stable lower-case provider cache keys", () => {
    expect(
      getEarnQueryCacheKey({
        providerId: "SEEK",
        resource: "Positions",
        scope: ["1", "0xABC", "0xDEF,0x123"],
      })
    ).toBe("earn:seek:positions:1:0xabc:0xdef%2C0x123")
  })

  it("skips nullish scope parts but keeps empty strings as distinct segments", () => {
    expect(
      getEarnQueryCacheKey({ providerId: "seek", resource: "r", scope: [null, undefined, "x"] })
    ).toBe("earn:seek:r:x")
    expect(getEarnQueryCacheKey({ providerId: "seek", resource: "r", scope: ["", "x"] })).toBe(
      "earn:seek:r::x"
    )
  })
})

describe("createEarnQueryCachePersister", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("deserializes cached DTOs before returning data", async () => {
    mockedApi.queryCacheGet.mockResolvedValue({
      data: { amount: "123" },
      dataUpdatedAt: Date.now() - 1000,
    })

    const persister = createEarnQueryCachePersister<{ amount: bigint }, { amount: string }>({
      key: "earn:test:bigint",
      serialize: (data) => ({ amount: data.amount.toString() }),
      deserialize: (data) => ({ amount: BigInt(data.amount) }),
    })
    const queryFn = vi.fn().mockResolvedValue({ amount: 456n })
    const result = await persister(
      queryFn,
      {
        queryKey: ["test"] as const,
        signal: new AbortController().signal,
        meta: undefined,
      },
      {
        state: { data: undefined, dataUpdatedAt: 0 },
        isStale: () => false,
        setState: vi.fn(),
        fetch: vi.fn(),
      } as never
    )

    expect(result).toEqual({ amount: 123n })
    expect(queryFn).not.toHaveBeenCalled()
  })

  it("serializes fetched data before writing to cache", async () => {
    mockedApi.queryCacheGet.mockResolvedValue(null)
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createEarnQueryCachePersister<{ amount: bigint }, { amount: string }>({
      key: "earn:test:write",
      serialize: (data) => ({ amount: data.amount.toString() }),
      deserialize: (data) => ({ amount: BigInt(data.amount) }),
      maxAge: 60_000,
    })

    const result = await persister(
      vi.fn().mockResolvedValue({ amount: 456n }),
      {
        queryKey: ["test"] as const,
        signal: new AbortController().signal,
        meta: undefined,
      },
      {
        state: { data: undefined, dataUpdatedAt: Date.now() },
      } as never
    )

    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(result).toEqual({ amount: 456n })
    expect(mockedApi.queryCacheSet).toHaveBeenCalledWith(
      "earn:test:write",
      { amount: "456" },
      expect.any(Number),
      expect.any(Number)
    )
  })
})
