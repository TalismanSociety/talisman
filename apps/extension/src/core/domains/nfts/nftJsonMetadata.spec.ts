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

const FOUR_HOURS = 4 * 60 * 60 * 1000
const URI = "https://example.com/1.json"

const jsonResponse = (body: unknown) => ({ ok: true, status: 200, json: async () => body })
const notFound = () => ({ ok: false, status: 404, json: async () => ({}) })

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

  it("reuses metadata persisted by a previous session", async () => {
    blob.stored = { [URI]: { at: 0, json: { name: "Stored" } } }
    const { fetchNftJsonMetadata } = await loadModule()

    expect(await fetchNftJsonMetadata(URI, new AbortController().signal)).toEqual({
      name: "Stored",
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("yields no metadata on failure and retries only after four hours", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    const signal = new AbortController().signal
    fetchMock.mockResolvedValueOnce(notFound())
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"))
    fetchMock.mockResolvedValueOnce(jsonResponse("not an object"))

    expect(await fetchNftJsonMetadata(URI, signal)).toBeNull()
    vi.advanceTimersByTime(FOUR_HOURS - 1)
    expect(await fetchNftJsonMetadata(URI, signal)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(await fetchNftJsonMetadata(URI, signal)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(FOUR_HOURS)
    expect(await fetchNftJsonMetadata(URI, signal)).toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(3)
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

  it("evicts the least recently used URI past 2000 entries", async () => {
    const { fetchNftJsonMetadata } = await loadModule()
    const signal = new AbortController().signal
    fetchMock.mockImplementation(async (url: string) => jsonResponse({ name: url }))

    for (let i = 0; i < 2000; i++) {
      await fetchNftJsonMetadata(`https://example.com/${i}.json`, signal)
      vi.advanceTimersByTime(1)
    }
    await fetchNftJsonMetadata("https://example.com/0.json", signal)
    vi.advanceTimersByTime(1)
    await fetchNftJsonMetadata("https://example.com/new.json", signal)
    expect(fetchMock).toHaveBeenCalledTimes(2001)

    await fetchNftJsonMetadata("https://example.com/0.json", signal)
    expect(fetchMock).toHaveBeenCalledTimes(2001)
    await fetchNftJsonMetadata("https://example.com/1.json", signal)
    expect(fetchMock).toHaveBeenCalledTimes(2002)
  })
})
