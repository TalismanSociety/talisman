import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { makeChaindata, makeOrphanedNetwork } from "../__fixtures__/chaindata"
import { CHAINDATA_PUB_FOLDER } from "../constants"

const PRIMARY_URL = `https://raw.githubusercontent.com/TalismanSociety/chaindata/main/${CHAINDATA_PUB_FOLDER}/chaindata.min.json`
const FALLBACK_URL = `https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@main/${CHAINDATA_PUB_FOLDER}/chaindata.min.json`

const mockFetch = vi.fn<typeof globalThis.fetch>()
vi.stubGlobal("fetch", mockFetch)

const okResponse = (data: unknown) =>
  new Response(JSON.stringify(data), { status: 200, statusText: "OK" })
const errorResponse = (status: number, statusText = "Error") =>
  new Response(null, { status, statusText })

describe("net / fetchChaindata", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns validated data when fetch succeeds with valid schema", async () => {
    const validData = makeChaindata()
    mockFetch.mockResolvedValueOnce(okResponse(validData))

    const { fetchChaindata } = await import("./net")
    const result = await fetchChaindata()

    expect(mockFetch).toHaveBeenCalledOnce()
    expect(mockFetch).toHaveBeenCalledWith(PRIMARY_URL, { signal: undefined })
    expect(result.networks).toHaveLength(3)
    expect(result.tokens).toHaveLength(3)
    expect(result.miniMetadatas).toHaveLength(1)
  })

  it("throws when fetch returns data that fails schema validation", async () => {
    const invalidData = makeChaindata({
      networks: [makeOrphanedNetwork()],
      tokens: [],
    })
    mockFetch.mockResolvedValueOnce(okResponse(invalidData))

    const { fetchChaindata } = await import("./net")

    await expect(fetchChaindata()).rejects.toThrow(`Schema validation failed for ${PRIMARY_URL}`)
  })

  it("falls back to jsdelivr CDN when primary URL returns HTTP error", async () => {
    const validData = makeChaindata()
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(okResponse(validData))

    const { fetchChaindata } = await import("./net")
    const result = await fetchChaindata()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(1, PRIMARY_URL, { signal: undefined })
    expect(mockFetch).toHaveBeenNthCalledWith(2, FALLBACK_URL, { signal: undefined })
    expect(result.networks).toHaveLength(3)
  })

  it("throws when a non-GitHub URL returns an error (no fallback available)", async () => {
    // fetchJsonFromGithubUrl is private, so we test this indirectly:
    // the fallback URL (cdn.jsdelivr.net) doesn't have its own fallback,
    // so if both primary and fallback fail, the second call throws.
    mockFetch
      .mockResolvedValueOnce(errorResponse(500))
      .mockResolvedValueOnce(errorResponse(404, "Not Found"))

    const { fetchChaindata } = await import("./net")

    await expect(fetchChaindata()).rejects.toThrow(
      `Failed to fetch from ${FALLBACK_URL}: 404 Not Found`
    )
  })

  it("throws when both primary and fallback URLs return HTTP errors", async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(errorResponse(503, "Service Unavailable"))

    const { fetchChaindata } = await import("./net")

    await expect(fetchChaindata()).rejects.toThrow(
      `Failed to fetch from ${FALLBACK_URL}: 503 Service Unavailable`
    )
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it("throws on schema validation failure instead of just warning", async () => {
    // This verifies the KEY behavior: schema failures throw, not just log
    const badData = { networks: "not-an-array", tokens: null, miniMetadatas: [] }
    mockFetch.mockResolvedValueOnce(okResponse(badData))

    const { fetchChaindata } = await import("./net")

    await expect(fetchChaindata()).rejects.toThrow("Schema validation failed")
  })

  it("propagates AbortError when signal is aborted", async () => {
    const abortController = new AbortController()
    abortController.abort()

    mockFetch.mockRejectedValueOnce(
      Object.assign(new Error("The operation was aborted"), { name: "AbortError" })
    )

    const { fetchChaindata } = await import("./net")

    await expect(fetchChaindata(abortController.signal)).rejects.toThrow(
      "The operation was aborted"
    )
  })

  it("passes AbortSignal through to fetch", async () => {
    const controller = new AbortController()
    const validData = makeChaindata()
    mockFetch.mockResolvedValueOnce(okResponse(validData))

    const { fetchChaindata } = await import("./net")
    await fetchChaindata(controller.signal)

    expect(mockFetch).toHaveBeenCalledWith(PRIMARY_URL, { signal: controller.signal })
  })
})

describe("net / getFallbackUrl", () => {
  it("converts gitraw urls to jsdelivr", async () => {
    const { getFallbackUrl } = await import("./net")

    expect(
      getFallbackUrl(
        "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/pub/v10/chaindata.min.json"
      )
    ).toBe("https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@main/pub/v10/chaindata.min.json")
  })

  it("keeps branch names containing slashes verbatim (jsdelivr resolves them greedily)", async () => {
    const { getFallbackUrl } = await import("./net")

    expect(
      getFallbackUrl(
        "https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/my-branch/pub/v10/chaindata.min.json"
      )
    ).toBe(
      "https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@feat/my-branch/pub/v10/chaindata.min.json"
    )

    expect(
      getFallbackUrl(
        "https://raw.githubusercontent.com/TalismanSociety/chaindata/archived/feat/split-entities/pub/v10/chaindata.min.json"
      )
    ).toBe(
      "https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@archived/feat/split-entities/pub/v10/chaindata.min.json"
    )
  })

  it("returns null for non-gitraw urls", async () => {
    const { getFallbackUrl } = await import("./net")

    expect(
      getFallbackUrl("https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@main/file.json")
    ).toBeNull()
    expect(getFallbackUrl("https://example.com/file.json")).toBeNull()
  })

  it("returns null for malformed gitraw urls instead of recursing on the same url", async () => {
    const { getFallbackUrl } = await import("./net")

    expect(getFallbackUrl("https://raw.githubusercontent.com/")).toBeNull()
    expect(getFallbackUrl("https://raw.githubusercontent.com/user-only")).toBeNull()
  })
})

describe("net / fetchChaindata with slashed branch", () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.doUnmock("../constants")
    vi.resetModules()
  })

  it("falls back to a correct jsdelivr url when the chaindata branch contains a slash", async () => {
    vi.resetModules()
    vi.doMock("../constants", async (importOriginal) => {
      const original = await importOriginal<typeof import("../constants")>()
      return {
        ...original,
        githubChaindataDistUrl: `https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/test-branch/${CHAINDATA_PUB_FOLDER}`,
      }
    })

    const validData = makeChaindata()
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, "Internal Server Error"))
      .mockResolvedValueOnce(okResponse(validData))

    const { fetchChaindata } = await import("./net")
    const result = await fetchChaindata()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenNthCalledWith(
      1,
      `https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/test-branch/${CHAINDATA_PUB_FOLDER}/chaindata.min.json`,
      { signal: undefined }
    )
    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      `https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@feat/test-branch/${CHAINDATA_PUB_FOLDER}/chaindata.min.json`,
      { signal: undefined }
    )
    expect(result.networks).toHaveLength(3)
  })
})
