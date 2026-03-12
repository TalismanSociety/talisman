import type { Subscription } from "rxjs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeChaindata } from "../__fixtures__/chaindata"
import type { Chaindata } from "./schema"

vi.mock("./net", () => ({
  fetchChaindata: vi.fn(),
}))

// Re-import the mock so we can control it per test
const { fetchChaindata } = await import("./net")
const mockFetchChaindata = vi.mocked(fetchChaindata)

const validChaindata = makeChaindata()

describe("githubChaindata$", () => {
  let sub: Subscription | undefined

  beforeEach(() => {
    vi.useFakeTimers()
    mockFetchChaindata.mockReset()
  })

  afterEach(() => {
    sub?.unsubscribe()
    sub = undefined
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const importFresh = async () => {
    vi.resetModules()
    // re-register the mock after module reset
    vi.doMock("./net", () => ({ fetchChaindata: mockFetchChaindata }))
    const mod = await import("./githubChaindata")
    return mod.githubChaindata$
  }

  it("emits data on first subscription", async () => {
    mockFetchChaindata.mockResolvedValueOnce(validChaindata)

    const githubChaindata$ = await importFresh()

    const result = await new Promise<Chaindata>((resolve, reject) => {
      sub = githubChaindata$.subscribe({ next: resolve, error: reject })
    })

    expect(result.networks).toHaveLength(3)
    expect(result.tokens).toHaveLength(3)
    expect(mockFetchChaindata).toHaveBeenCalledOnce()
  })

  it("propagates errors from fetchChaindata to subscribers", async () => {
    const testError = new Error("Network failure")
    mockFetchChaindata.mockRejectedValueOnce(testError)

    const githubChaindata$ = await importFresh()

    const error = await new Promise<Error>((resolve) => {
      sub = githubChaindata$.subscribe({
        next: () => resolve(new Error("Should not emit")),
        error: resolve,
      })
    })

    expect(error.message).toBe("Network failure")
  })

  it("aborts in-flight fetch on unsubscribe", async () => {
    // fetchChaindata never resolves so the observable stays pending
    mockFetchChaindata.mockImplementation(
      (signal?: AbortSignal) =>
        new Promise<Chaindata>((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
          )
        })
    )

    const githubChaindata$ = await importFresh()

    sub = githubChaindata$.subscribe({ next: vi.fn(), error: vi.fn() })

    // The fetchChaindata was called with a signal
    expect(mockFetchChaindata).toHaveBeenCalledOnce()
    const signal = mockFetchChaindata.mock.calls[0]![0] as AbortSignal
    expect(signal.aborted).toBe(false)

    // Unsubscribe should abort
    sub.unsubscribe()
    sub = undefined
    expect(signal.aborted).toBe(true)
  })

  it("enforces minimum 60s interval between refreshes", async () => {
    const secondChaindata = makeChaindata()

    mockFetchChaindata.mockResolvedValueOnce(validChaindata).mockResolvedValueOnce(secondChaindata)

    const githubChaindata$ = await importFresh()

    const emissions: Chaindata[] = []
    sub = githubChaindata$.subscribe({
      next: (data) => emissions.push(data),
      error: () => {},
    })

    // Wait for the first emission
    await vi.advanceTimersByTimeAsync(0)
    expect(emissions).toHaveLength(1)
    expect(mockFetchChaindata).toHaveBeenCalledTimes(1)

    // Advance to the next refresh (5 min), but only 5 min has passed
    // The refresh function will wait for the 60s delay (which is 0 since >60s passed)
    await vi.advanceTimersByTimeAsync(300_000)
    // Let the setTimeout(resolve, delay) inside refresh settle
    await vi.advanceTimersByTimeAsync(0)

    expect(mockFetchChaindata).toHaveBeenCalledTimes(2)
    expect(emissions).toHaveLength(2)
  })

  it("does not re-fetch within the 60s debounce window", async () => {
    mockFetchChaindata.mockResolvedValue(validChaindata)

    const githubChaindata$ = await importFresh()

    const emissions: Chaindata[] = []
    sub = githubChaindata$.subscribe({
      next: (data) => emissions.push(data),
      error: () => {},
    })

    // First emission
    await vi.advanceTimersByTimeAsync(0)
    expect(emissions).toHaveLength(1)

    // Trigger a refresh after only 30s (within the 60s window)
    // The refresh function schedules itself with setTimeout(refresh, REFRESH_INTERVAL)
    // so we advance 5 min to trigger next refresh
    await vi.advanceTimersByTimeAsync(300_000)
    // The refresh function will compute delay = max(0, lastUpdatedAt + 60_000 - Date.now())
    // Since 300s > 60s, delay = 0 → proceeds immediately
    // But the setTimeout(resolve, 0) still needs to resolve
    await vi.advanceTimersByTimeAsync(0)

    expect(mockFetchChaindata).toHaveBeenCalledTimes(2)
    expect(emissions).toHaveLength(2)
  })

  it("schedules next refresh after successful fetch", async () => {
    mockFetchChaindata.mockResolvedValue(validChaindata)

    const githubChaindata$ = await importFresh()

    sub = githubChaindata$.subscribe({ next: vi.fn(), error: vi.fn() })

    // First fetch
    await vi.advanceTimersByTimeAsync(0)
    expect(mockFetchChaindata).toHaveBeenCalledTimes(1)

    // Advance by 5 minutes → triggers second refresh
    await vi.advanceTimersByTimeAsync(300_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(mockFetchChaindata).toHaveBeenCalledTimes(2)

    // Advance by another 5 minutes → triggers third refresh
    await vi.advanceTimersByTimeAsync(300_000)
    await vi.advanceTimersByTimeAsync(0)
    expect(mockFetchChaindata).toHaveBeenCalledTimes(3)
  })
})
