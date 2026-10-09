import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const blob = vi.hoisted(() => ({
  stored: null as unknown,
  set: vi.fn(),
}))

vi.mock("../../db/blobs", () => ({
  getBlobStore: () => ({
    get: async () => blob.stored,
    set: blob.set,
  }),
}))

vi.mock("../../libs/isWalletReady", () => ({ walletReady: Promise.resolve() }))

const TEN_MINUTES = 10 * 60 * 1000
const ONE_DAY = 24 * 60 * 60 * 1000
const SEVEN_DAYS = 7 * ONE_DAY
const THIRTY_DAYS = 30 * ONE_DAY
const URI = "https://example.com/1.json"

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body))
const httpError = (status: number) => new Response("{}", { status })
const notFound = () => httpError(404)
const timeout = () => new DOMException("The operation timed out", "TimeoutError")
const stored = (json: unknown, attemptedAt: number, nextAttemptAt = attemptedAt + SEVEN_DAYS) => ({
  json,
  attemptedAt,
  nextAttemptAt,
})

const fetchMock = vi.fn()

const loadModule = async () => {
  vi.resetModules()
  return import("./nftJsonMetadata")
}

beforeEach(() => {
  blob.stored = null
  blob.set.mockReset()
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  vi.useFakeTimers({
    toFake: ["Date", "setTimeout", "clearTimeout", "setInterval", "clearInterval"],
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("parseNftJsonMetadata", () => {
  it.each([null, "a string", 42, [{ name: "x" }]])("rejects %j", async (value) => {
    const { parseNftJsonMetadata } = await loadModule()
    expect(parseNftJsonMetadata(value)).toBeNull()
  })

  it("keeps known fields of the expected type and usable attributes", async () => {
    const { parseNftJsonMetadata } = await loadModule()
    expect(
      parseNftJsonMetadata({
        name: "Item",
        description: 12,
        image: "ipfs://x",
        animation_url: null,
        external_url: "https://example.com",
        attributes: [
          { trait_type: "Colour", value: "Red" },
          { trait_type: "Level", value: 2 },
          { trait_type: "Nested", value: { a: 1 } },
          { value: "no type" },
          "junk",
        ],
      })
    ).toEqual({
      name: "Item",
      image: "ipfs://x",
      external_url: "https://example.com",
      attributes: [
        { trait_type: "Colour", value: "Red" },
        { trait_type: "Level", value: 2 },
      ],
    })
  })

  it("truncates oversized text and attribute lists", async () => {
    const { parseNftJsonMetadata } = await loadModule()
    const parsed = parseNftJsonMetadata({
      name: "n".repeat(250),
      description: "d".repeat(2500),
      attributes: Array.from({ length: 60 }, (_, i) => ({
        trait_type: `t${i}`.padEnd(150, "x"),
        value: "v".repeat(150),
      })),
    })

    expect(parsed?.name).toHaveLength(200)
    expect(parsed?.description).toHaveLength(2000)
    expect(parsed?.attributes).toHaveLength(50)
    expect(parsed?.attributes?.[0].trait_type).toHaveLength(100)
    expect(parsed?.attributes?.[0].value).toHaveLength(100)
    expect(parsed?.attributes?.[49].trait_type.startsWith("t49")).toBe(true)
  })

  it("reads attributes under the traits key", async () => {
    const { parseNftJsonMetadata } = await loadModule()
    expect(parseNftJsonMetadata({ traits: [{ trait_type: "Eyes", value: true }] })).toEqual({
      attributes: [{ trait_type: "Eyes", value: true }],
    })
  })
})

describe("fetchNftJsonMetadata", () => {
  it("downloads a URI once and persists it in a single write", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    fetchMock.mockResolvedValue(jsonResponse({ name: "Item" }))

    const signal = new AbortController().signal
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "Item" })
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "Item" })
    await fetchNftJsonMetadata("https://example.com/2.json", signal)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(blob.set).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1_000)
    expect(blob.set).toHaveBeenCalledTimes(1)
    expect(Object.keys(blob.set.mock.calls[0][0])).toEqual([URI, "https://example.com/2.json"])
  })

  it("shares one download between concurrent callers of the same URI", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    fetchMock.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(jsonResponse({ name: "Item" })), 50))
    )

    const signal = new AbortController().signal
    const results = Promise.all([
      fetchNftJsonMetadata(URI, signal),
      fetchNftJsonMetadata(URI, signal),
    ])
    await vi.advanceTimersByTimeAsync(50)

    expect(await results).toEqual([{ name: "Item" }, { name: "Item" }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("reuses metadata persisted by a previous session", async () => {
    blob.stored = { [URI]: stored({ name: "Stored" }, Date.now()) }
    const { fetchNftJsonMetadata } = await loadModule()

    expect(await fetchNftJsonMetadata(URI, new AbortController().signal)).toEqual({
      name: "Stored",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  const retriesAfter = async (delay: number, failOnce: () => void) => {
    const { fetchNftJsonMetadata } = await loadModule()
    const signal = new AbortController().signal
    failOnce()
    fetchMock.mockResolvedValue(jsonResponse({ name: "Later" }))

    expect(await fetchNftJsonMetadata(URI, signal)).toBeNull()
    vi.advanceTimersByTime(delay - 1)
    expect(await fetchNftJsonMetadata(URI, signal)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "Later" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  }

  const respondsOnce = (response: unknown) => () => fetchMock.mockResolvedValueOnce(response)
  const rejectsOnce = (error: unknown) => () => fetchMock.mockRejectedValueOnce(error)

  it.each([
    ["HTTP 404", respondsOnce(notFound())],
    ["HTTP 403", respondsOnce(httpError(403))],
    ["JSON that is not an object", respondsOnce(jsonResponse("not an object"))],
    ["malformed JSON", respondsOnce(new Response("{oops"))],
    [
      "a content-length above 256 KiB",
      respondsOnce(new Response("{}", { headers: { "content-length": String(257 * 1024) } })),
    ],
    [
      "a streamed body above 256 KiB",
      respondsOnce(new Response(`{"name":"${"x".repeat(257 * 1024)}"}`)),
    ],
  ])("retries a definitive failure (%s) after a day", (_, failOnce) =>
    retriesAfter(ONE_DAY, failOnce)
  )

  it.each([
    ["network error", rejectsOnce(new TypeError("Failed to fetch"))],
    ["timeout", rejectsOnce(timeout())],
    ["HTTP 429", respondsOnce(httpError(429))],
    ["HTTP 503", respondsOnce(httpError(503))],
  ])("retries a transient failure (%s) after ten minutes", (_, failOnce) =>
    retriesAfter(TEN_MINUTES, failOnce)
  )

  it("keeps the previous metadata when a refetch fails, then retries", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    const signal = new AbortController().signal
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: "Before" }))
    fetchMock.mockResolvedValueOnce(httpError(503))
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: "After" }))

    await fetchNftJsonMetadata(URI, signal)
    vi.advanceTimersByTime(SEVEN_DAYS)
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "Before" })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(TEN_MINUTES - 1)
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "Before" })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(1)
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "After" })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("persists stale metadata so it survives a restart during an outage", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    const signal = new AbortController().signal
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: "Before" }))
    fetchMock.mockResolvedValue(httpError(503))

    await fetchNftJsonMetadata(URI, signal)
    vi.advanceTimersByTime(SEVEN_DAYS)
    await fetchNftJsonMetadata(URI, signal)
    await vi.advanceTimersByTimeAsync(1_000)

    const persisted = blob.set.mock.calls.at(-1)?.[0]
    expect(persisted[URI].json).toEqual({ name: "Before" })
  })

  it("throws on abort without recording a failure", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    const controller = new AbortController()
    fetchMock.mockImplementationOnce(async (_url: string, init: RequestInit) => {
      controller.abort()
      init.signal?.throwIfAborted()
    })

    await expect(fetchNftJsonMetadata(URI, controller.signal)).rejects.toThrow()

    fetchMock.mockResolvedValueOnce(jsonResponse({ name: "Item" }))
    expect(await fetchNftJsonMetadata(URI, new AbortController().signal)).toEqual({
      name: "Item",
    })
  })

  it("serves every URI of a large wallet from cache on the next refresh", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    const signal = new AbortController().signal
    fetchMock.mockImplementation(async (url: string) => jsonResponse({ name: url }))
    const uris = Array.from({ length: 3000 }, (_, i) => `https://example.com/${i}.json`)

    for (const uri of uris) await fetchNftJsonMetadata(uri, signal)
    for (const uri of uris) await fetchNftJsonMetadata(uri, signal)

    expect(fetchMock).toHaveBeenCalledTimes(3000)
  })

  it("refetches metadata seven days after downloading it", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    const signal = new AbortController().signal
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: "Before" }))
    fetchMock.mockResolvedValueOnce(jsonResponse({ name: "After" }))

    await fetchNftJsonMetadata(URI, signal)
    vi.advanceTimersByTime(SEVEN_DAYS - 1)
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "Before" })

    vi.advanceTimersByTime(1)
    expect(await fetchNftJsonMetadata(URI, signal)).toEqual({ name: "After" })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("drops entries not attempted for thirty days when persisting", async () => {
    blob.stored = {
      "https://example.com/forgotten.json": stored({ name: "Forgotten" }, 0),
      "https://example.com/expired.json": stored({ name: "Expired" }, THIRTY_DAYS - SEVEN_DAYS),
    }
    vi.setSystemTime(THIRTY_DAYS)
    const { fetchNftJsonMetadata } = await loadModule()
    fetchMock.mockResolvedValue(jsonResponse({ name: "Item" }))

    await fetchNftJsonMetadata(URI, new AbortController().signal)
    await vi.advanceTimersByTimeAsync(1_000)

    expect(Object.keys(blob.set.mock.calls[0][0])).toEqual([
      "https://example.com/expired.json",
      URI,
    ])
  })
})
