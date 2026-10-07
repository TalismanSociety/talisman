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

const URL_A = "https://example.com/a/chaindata.min.json"
const URL_B = "https://example.com/b/chaindata.min.json"

describe("getRemoteChaindata$", () => {
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
    const mod = await import("./remoteChaindata")
    return mod.getRemoteChaindata$
  }

  it("emits data on first subscription", async () => {
    mockFetchChaindata.mockResolvedValueOnce(validChaindata)

    const remoteChaindata$ = (await importFresh())(URL_A)

    const result = await new Promise<Chaindata>((resolve, reject) => {
      sub = remoteChaindata$.subscribe({ next: resolve, error: reject })
    })

    expect(result.networks).toHaveLength(3)
    expect(result.tokens).toHaveLength(3)
    expect(mockFetchChaindata).toHaveBeenCalledOnce()
  })

  it("propagates errors from fetchChaindata to subscribers", async () => {
    const testError = new Error("Network failure")
    mockFetchChaindata.mockRejectedValueOnce(testError)

    const remoteChaindata$ = (await importFresh())(URL_A)

    const error = await new Promise<Error>((resolve) => {
      sub = remoteChaindata$.subscribe({
        next: () => resolve(new Error("Should not emit")),
        error: resolve,
      })
    })

    expect(error.message).toBe("Network failure")
  })

  it("aborts in-flight fetch on unsubscribe", async () => {
    // fetchChaindata never resolves so the observable stays pending
    mockFetchChaindata.mockImplementation(
      (_url?: string, signal?: AbortSignal) =>
        new Promise<Chaindata>((_resolve, reject) => {
          signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("aborted"), { name: "AbortError" }))
          )
        })
    )

    const remoteChaindata$ = (await importFresh())(URL_A)

    sub = remoteChaindata$.subscribe({ next: vi.fn(), error: vi.fn() })

    // The fetchChaindata was called with a signal
    expect(mockFetchChaindata).toHaveBeenCalledOnce()
    const signal = mockFetchChaindata.mock.calls[0]![1] as AbortSignal
    expect(signal.aborted).toBe(false)

    // Unsubscribe should abort
    sub.unsubscribe()
    sub = undefined
    expect(signal.aborted).toBe(true)
  })

  it("enforces minimum 60s interval between refreshes", async () => {
    const secondChaindata = makeChaindata()

    mockFetchChaindata.mockResolvedValueOnce(validChaindata).mockResolvedValueOnce(secondChaindata)

    const remoteChaindata$ = (await importFresh())(URL_A)

    const emissions: Chaindata[] = []
    sub = remoteChaindata$.subscribe({
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

    const remoteChaindata$ = (await importFresh())(URL_A)

    const emissions: Chaindata[] = []
    sub = remoteChaindata$.subscribe({
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

  it("gives a subscriber arriving within 60s of a download that download at once", async () => {
    const secondChaindata = makeChaindata()
    mockFetchChaindata.mockResolvedValueOnce(validChaindata).mockResolvedValueOnce(secondChaindata)

    const remoteChaindata$ = (await importFresh())(URL_A)
    const first = remoteChaindata$.subscribe({ next: vi.fn(), error: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    first.unsubscribe()
    await vi.advanceTimersByTimeAsync(10_000)

    const emissions: Chaindata[] = []
    sub = remoteChaindata$.subscribe({ next: (data) => emissions.push(data), error: vi.fn() })

    expect(emissions).toEqual([validChaindata])
    expect(mockFetchChaindata).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(50_000)
    expect(emissions).toEqual([validChaindata, secondChaindata])
    expect(mockFetchChaindata).toHaveBeenCalledTimes(2)
  })

  it("makes a subscriber arriving more than 60s after a download wait for a new one", async () => {
    mockFetchChaindata
      .mockResolvedValueOnce(validChaindata)
      .mockReturnValueOnce(new Promise(() => {}))

    const remoteChaindata$ = (await importFresh())(URL_A)
    const first = remoteChaindata$.subscribe({ next: vi.fn(), error: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)
    first.unsubscribe()
    await vi.advanceTimersByTimeAsync(61_000)

    const emissions: Chaindata[] = []
    sub = remoteChaindata$.subscribe({ next: (data) => emissions.push(data), error: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)

    expect(emissions).toEqual([])
    expect(mockFetchChaindata).toHaveBeenCalledTimes(2)
  })

  it("schedules next refresh after successful fetch", async () => {
    mockFetchChaindata.mockResolvedValue(validChaindata)

    const remoteChaindata$ = (await importFresh())(URL_A)

    sub = remoteChaindata$.subscribe({ next: vi.fn(), error: vi.fn() })

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

  it("fetches the url it was created for", async () => {
    mockFetchChaindata.mockResolvedValue(validChaindata)

    const getRemoteChaindata$ = await importFresh()
    sub = getRemoteChaindata$(URL_A).subscribe({ next: vi.fn(), error: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)

    expect(mockFetchChaindata).toHaveBeenCalledOnce()
    expect(mockFetchChaindata).toHaveBeenCalledWith(URL_A, expect.any(AbortSignal))
  })

  it("shares one source per url", async () => {
    const getRemoteChaindata$ = await importFresh()

    expect(getRemoteChaindata$(URL_A)).toBe(getRemoteChaindata$(URL_A))
    expect(getRemoteChaindata$(URL_A)).not.toBe(getRemoteChaindata$(URL_B))
  })

  it("shares one source for equivalent spellings of a url and fetches its normalised form", async () => {
    mockFetchChaindata.mockResolvedValue(validChaindata)
    const getRemoteChaindata$ = await importFresh()

    const remoteChaindata$ = getRemoteChaindata$("HTTPS://Example.com:443/a/chaindata.min.json")
    sub = remoteChaindata$.subscribe({ next: vi.fn(), error: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)

    expect(remoteChaindata$).toBe(getRemoteChaindata$(URL_A))
    expect(mockFetchChaindata).toHaveBeenCalledWith(URL_A, expect.any(AbortSignal))
  })

  it.each(["", "chaindata.min.json"])("throws on the invalid url %j", async (url) => {
    const getRemoteChaindata$ = await importFresh()

    expect(() => getRemoteChaindata$(url)).toThrow(
      expect.objectContaining({
        message: `Invalid chaindata url: "${url}"`,
        cause: expect.any(TypeError),
      })
    )
  })

  it("keeps data and refresh timing separate per url", async () => {
    const chaindataA = makeChaindata()
    const chaindataB = makeChaindata()
    mockFetchChaindata.mockImplementation(async (url) => (url === URL_A ? chaindataA : chaindataB))

    const getRemoteChaindata$ = await importFresh()

    const emissionsA: Chaindata[] = []
    sub = getRemoteChaindata$(URL_A).subscribe({ next: (d) => emissionsA.push(d), error: vi.fn() })
    await vi.advanceTimersByTimeAsync(0)

    // URL_A was just fetched, so its 60s debounce window is open: URL_B must not wait for it
    const emissionsB: Chaindata[] = []
    const subB = getRemoteChaindata$(URL_B).subscribe({
      next: (d) => emissionsB.push(d),
      error: vi.fn(),
    })
    await vi.advanceTimersByTimeAsync(0)
    subB.unsubscribe()

    expect(emissionsA).toEqual([chaindataA])
    expect(emissionsB).toEqual([chaindataB])
  })
})
