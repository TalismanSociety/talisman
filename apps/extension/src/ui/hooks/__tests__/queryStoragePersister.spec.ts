import type { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createQueryStoragePersister } from "../queryStoragePersister"

vi.mock("@ui/api/api", () => ({
  api: {
    queryCacheGet: vi.fn(),
    queryCacheSet: vi.fn(),
    queryCacheRemove: vi.fn(),
  },
}))

const { api } = await import("@ui/api/api")
const mockedApi = vi.mocked(api)

const context = {
  queryKey: ["test"] as const,
  signal: new AbortController().signal,
  meta: undefined,
  // react-query 5.100+ added `client` to QueryFunctionContext; the persister never reads it
  client: {} as QueryClient,
}

// notifyManager.schedule runs its callback in a setTimeout(0), so one later macrotask sees it
const flushScheduled = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("createQueryStoragePersister", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  afterEach(async () => {
    await flushScheduled()
  })

  it("should call queryFn and persist result when no cached data exists", async () => {
    mockedApi.queryCacheGet.mockResolvedValue(null)
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "test-key", maxAge: 60_000 })
    const queryFn = vi.fn().mockResolvedValue({ price: 42 })
    const query = {
      state: { data: undefined, dataUpdatedAt: Date.now() },
      options: { staleTime: 0 },
      isStale: () => true,
    }

    const result = await persister(queryFn, context, query as never)
    await flushScheduled()

    expect(result).toEqual({ price: 42 })
    expect(queryFn).toHaveBeenCalledWith(context)
    expect(mockedApi.queryCacheGet).toHaveBeenCalledWith("test-key")
    expect(mockedApi.queryCacheSet).toHaveBeenCalledWith(
      "test-key",
      { price: 42 },
      expect.any(Number),
      expect.any(Number)
    )
  })

  it("should return cached data without calling queryFn when cache hit and data is undefined", async () => {
    const cachedData = { price: 99 }
    const cachedAt = Date.now() - 1000
    mockedApi.queryCacheGet.mockResolvedValue({ data: cachedData, dataUpdatedAt: cachedAt })

    const persister = createQueryStoragePersister({ key: "cached-key" })
    const queryFn = vi.fn().mockResolvedValue({ price: 100 })
    const query = {
      state: { data: undefined, dataUpdatedAt: 0 },
      options: { staleTime: 0 },
      isStale: () => true,
      setState: vi.fn(),
      fetch: vi.fn(),
    }

    const result = await persister(queryFn, context, query as never)
    await flushScheduled()

    expect(result).toEqual(cachedData)
    expect(queryFn).not.toHaveBeenCalled()
    expect(query.setState).toHaveBeenCalledWith({ dataUpdatedAt: cachedAt })
    expect(query.fetch).toHaveBeenCalled()
    expect(mockedApi.queryCacheSet).not.toHaveBeenCalled()
  })

  it("should skip cache restore when query already has data", async () => {
    mockedApi.queryCacheGet.mockResolvedValue({ data: { old: true }, dataUpdatedAt: Date.now() })
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "has-data" })
    const queryFn = vi.fn().mockResolvedValue({ fresh: true })
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
    const query = {
      state: { data: undefined, dataUpdatedAt: 0 },
    }

    const result = await persister(queryFn, context, query as never)

    expect(result).toEqual({ fallback: true })
    expect(queryFn).toHaveBeenCalled()
    expect(mockedApi.queryCacheRemove).toHaveBeenCalledWith("error-key")
  })

  it("should use default maxAge of 24 hours", async () => {
    mockedApi.queryCacheGet.mockResolvedValue(null)
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "default-age" })
    const queryFn = vi.fn().mockResolvedValue("data")
    const query = {
      state: { data: undefined, dataUpdatedAt: Date.now() - 5_000 },
    }

    const before = Date.now()
    await persister(queryFn, context, query as never)
    await flushScheduled()
    const after = Date.now()

    expect(mockedApi.queryCacheSet).toHaveBeenCalledTimes(1)
    const [, persistedData, purgeAt, persistedDataUpdatedAt] =
      mockedApi.queryCacheSet.mock.calls[0]!
    expect(persistedData).toBe("data")
    expect(purgeAt).toBeGreaterThanOrEqual(before + 86_400_000)
    expect(purgeAt).toBeLessThanOrEqual(after + 86_400_000)
    expect(persistedDataUpdatedAt).toBeGreaterThanOrEqual(before)
    expect(persistedDataUpdatedAt).toBeLessThanOrEqual(after)
  })

  it("should reset persisted timestamps when revalidation fetch succeeds", async () => {
    mockedApi.queryCacheSet.mockResolvedValue(true)

    const persister = createQueryStoragePersister({ key: "revalidate-key", maxAge: 60_000 })
    const queryFn = vi.fn().mockResolvedValue({ fresh: true })
    const query = {
      state: { data: { stale: true }, dataUpdatedAt: Date.now() - 60_000 },
    }

    const before = Date.now()
    const result = await persister(queryFn, context, query as never)
    await flushScheduled()
    const after = Date.now()

    expect(result).toEqual({ fresh: true })
    expect(mockedApi.queryCacheGet).not.toHaveBeenCalled()
    expect(mockedApi.queryCacheSet).toHaveBeenCalledTimes(1)

    const [, persistedData, purgeAt, persistedDataUpdatedAt] =
      mockedApi.queryCacheSet.mock.calls[0]!
    expect(persistedData).toEqual({ fresh: true })
    expect(purgeAt).toBeGreaterThanOrEqual(before + 60_000)
    expect(purgeAt).toBeLessThanOrEqual(after + 60_000)
    expect(persistedDataUpdatedAt).toBeGreaterThanOrEqual(before)
    expect(persistedDataUpdatedAt).toBeLessThanOrEqual(after)
  })
})
