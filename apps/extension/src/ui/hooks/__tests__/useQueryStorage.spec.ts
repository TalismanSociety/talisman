import { describe, expect, it, vi } from "vitest"

import { createQueryStoragePersister } from "../useQueryStorage"

// Mock the api module
vi.mock("@ui/api/api", () => ({
  api: {
    queryCacheGet: vi.fn(),
    queryCacheSet: vi.fn(),
    queryCacheRemove: vi.fn(),
  },
}))

// Import the mocked api after vi.mock
const { api } = await import("@ui/api/api")
const mockedApi = vi.mocked(api)

describe("createQueryStoragePersister", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    // Flush any pending notifyManager.schedule callbacks to prevent test leakage
    await new Promise((r) => setTimeout(r, 50))
    vi.clearAllMocks()
  })

  it("should call queryFn and persist result when no cached data exists", async () => {
    mockedApi.queryCacheGet.mockResolvedValue(null)
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "test-key", maxAge: 60_000 })
    const queryFn = vi.fn().mockResolvedValue({ price: 42 })
    const context = {
      queryKey: ["test"] as const,
      signal: new AbortController().signal,
      meta: undefined,
    }
    const query = {
      state: { data: undefined, dataUpdatedAt: Date.now() },
      options: { staleTime: 0 },
      isStale: () => true,
    }

    const result = await persister(queryFn, context, query as never)

    expect(result).toEqual({ price: 42 })
    expect(queryFn).toHaveBeenCalledWith(context)
    expect(mockedApi.queryCacheGet).toHaveBeenCalledWith("test-key")
  })

  it("should return cached data without calling queryFn when cache hit and data is undefined", async () => {
    const cachedData = { price: 99 }
    const cachedAt = Date.now() - 1000
    mockedApi.queryCacheGet.mockResolvedValue({ data: cachedData, dataUpdatedAt: cachedAt })

    const persister = createQueryStoragePersister({ key: "cached-key" })
    const queryFn = vi.fn().mockResolvedValue({ price: 100 })
    const context = {
      queryKey: ["test"] as const,
      signal: new AbortController().signal,
      meta: undefined,
    }
    const query = {
      state: { data: undefined, dataUpdatedAt: 0 },
      options: { staleTime: 0 },
      isStale: () => true,
      setState: vi.fn(),
      fetch: vi.fn(),
    }

    const result = await persister(queryFn, context, query as never)

    expect(result).toEqual(cachedData)
    expect(queryFn).not.toHaveBeenCalled()
  })

  it("should skip cache restore when query already has data", async () => {
    mockedApi.queryCacheGet.mockResolvedValue({ data: { old: true }, dataUpdatedAt: Date.now() })
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "has-data" })
    const queryFn = vi.fn().mockResolvedValue({ fresh: true })
    const context = {
      queryKey: ["test"] as const,
      signal: new AbortController().signal,
      meta: undefined,
    }
    const query = {
      state: { data: { existing: true }, dataUpdatedAt: Date.now() },
    }

    const result = await persister(queryFn, context, query as never)

    expect(result).toEqual({ fresh: true })
    expect(mockedApi.queryCacheGet).not.toHaveBeenCalled()
    expect(queryFn).toHaveBeenCalledWith(context)
  })

  it("should fall through to queryFn when cache get fails", async () => {
    mockedApi.queryCacheGet.mockRejectedValue(new Error("DB error"))
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "error-key" })
    const queryFn = vi.fn().mockResolvedValue({ fallback: true })
    const context = {
      queryKey: ["test"] as const,
      signal: new AbortController().signal,
      meta: undefined,
    }
    const query = {
      state: { data: undefined, dataUpdatedAt: 0 },
    }

    const result = await persister(queryFn, context, query as never)

    expect(result).toEqual({ fallback: true })
    expect(queryFn).toHaveBeenCalled()
  })

  it("should use default maxAge of 24 hours", async () => {
    mockedApi.queryCacheGet.mockResolvedValue(null)
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "default-age" })
    const queryFn = vi.fn().mockResolvedValue("data")
    const context = {
      queryKey: ["test"] as const,
      signal: new AbortController().signal,
      meta: undefined,
    }
    const dataUpdatedAt = Date.now()
    const query = {
      state: { data: undefined, dataUpdatedAt },
    }

    const before = Date.now()
    await persister(queryFn, context, query as never)

    // Flush scheduled notifyManager tasks
    await new Promise((r) => setTimeout(r, 10))
    const after = Date.now()

    expect(mockedApi.queryCacheSet).toHaveBeenCalledWith(
      "default-age",
      "data",
      expect.any(Number),
      dataUpdatedAt
    )

    // purgeAt should be ~24h from when the persist happened
    const [, , purgeAt] = mockedApi.queryCacheSet.mock.calls[0]!
    expect(purgeAt).toBeGreaterThanOrEqual(before + 86_400_000)
    expect(purgeAt).toBeLessThanOrEqual(after + 86_400_000)
  })
})
