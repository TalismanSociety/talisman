import { db } from "@core/db/db"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@core/domains/ethereum/helpers", () => ({
  isSafeImageUrl: (url?: string) => {
    if (!url) return true
    try {
      const urlObj = new URL(url)
      if (urlObj.protocol !== "https:") return false
      if (urlObj.port) return false
      if (!urlObj.pathname.match(/\.(jpeg|jpg|gif|png|svg|webp)$/)) return false
      return true
    } catch {
      return false
    }
  },
}))

// Dynamic import so we get a fresh module per test via vi.resetModules()
let imageCache: typeof import("./imageCache")

// Small 1x1 red PNG as test fixture
const RED_PIXEL_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,
])

const makePngBlob = () => new Blob([RED_PIXEL_PNG], { type: "image/png" })
const RED_PIXEL_DATA_URL = `data:image/png;base64,${Buffer.from(RED_PIXEL_PNG).toString("base64")}`

const TEST_URL = "https://example.com/logo.png"
const SENTINEL_URL = "https://example.com/sentinel.png"

const waitForCached = (mod: typeof imageCache, url: string) =>
  vi.waitFor(() => expect(mod.getCachedUrl(url)).not.toBeNull(), { interval: 5 })

// A fetch that caches nothing gives no signal when it ends. A later fetch that does cache
// runs the same pipeline through the same mocked fetch, in order, so its completion bounds it.
const ensureCachedAndSettle = async (url: string) => {
  await imageCache.ensureCached(url)
  imageCache.ensureCached(SENTINEL_URL)
  await waitForCached(imageCache, SENTINEL_URL)
}

describe("imageCache", () => {
  beforeEach(async () => {
    vi.resetModules()

    // Clear the Dexie table between tests
    await db.imageCache.clear()

    // Mock fetch to return our test PNG
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(makePngBlob()),
      })
    )

    imageCache = await import("./imageCache")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fetches and caches a URL on ensureCached", async () => {
    expect(imageCache.getCachedUrl(TEST_URL)).toBeNull()

    imageCache.ensureCached(TEST_URL)

    // Wait for the async fetch + cache pipeline to settle
    await waitForCached(imageCache, TEST_URL)

    expect(imageCache.getCachedUrl(TEST_URL)).toBe(RED_PIXEL_DATA_URL)
  })

  it("does not re-fetch if URL is already cached and fresh", async () => {
    imageCache.ensureCached(TEST_URL)

    await waitForCached(imageCache, TEST_URL)

    const fetchMock = vi.mocked(fetch)
    const callCount = fetchMock.mock.calls.length

    // Second call should be a no-op
    await imageCache.ensureCached(TEST_URL)

    expect(fetchMock).toHaveBeenCalledTimes(callCount)
  })

  it("skips blobs that are not images", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["not an image"], { type: "text/plain" })),
    } as Response)

    await ensureCachedAndSettle("https://example.com/text.png")

    expect(imageCache.getCachedUrl("https://example.com/text.png")).toBeNull()
  })

  it("skips blobs that exceed size limit", async () => {
    const bigBlob = new Blob([new Uint8Array(200_000)], { type: "image/png" })
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(bigBlob),
    } as Response)

    await ensureCachedAndSettle("https://example.com/huge.png")

    expect(imageCache.getCachedUrl("https://example.com/huge.png")).toBeNull()
  })

  it("handles fetch failures gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

    await ensureCachedAndSettle("https://example.com/fail.png")

    expect(imageCache.getCachedUrl("https://example.com/fail.png")).toBeNull()
  })

  it("handles non-ok responses gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      blob: () => Promise.resolve(makePngBlob()),
    } as Response)

    await ensureCachedAndSettle("https://example.com/404.png")

    expect(imageCache.getCachedUrl("https://example.com/404.png")).toBeNull()
  })

  it("deduplicates concurrent fetches for the same URL", async () => {
    imageCache.ensureCached(TEST_URL)
    imageCache.ensureCached(TEST_URL)
    imageCache.ensureCached(TEST_URL)

    await waitForCached(imageCache, TEST_URL)

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it("rejects URLs that fail isSafeImageUrl", async () => {
    const unsafeUrl = "https://example.com/script.js"
    await imageCache.ensureCached(unsafeUrl)

    expect(imageCache.getCachedUrl(unsafeUrl)).toBeNull()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("refetches a stale entry after hydrating it", async () => {
    const staleEntry = { url: TEST_URL, dataUrl: "data:image/png;base64,STALE", fetchedAt: 1000 }
    await db.imageCache.put(staleEntry)
    vi.resetModules()
    const freshModule = await import("./imageCache")

    freshModule.ensureCached(TEST_URL)
    await vi.waitFor(() => expect(freshModule.getCachedUrl(TEST_URL)).toBe(RED_PIXEL_DATA_URL), {
      interval: 5,
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it("persists to and hydrates from Dexie", async () => {
    // Cache an entry
    imageCache.ensureCached(TEST_URL)
    await waitForCached(imageCache, TEST_URL)

    const cachedBefore = imageCache.getCachedUrl(TEST_URL)

    // Verify it was persisted to Dexie
    const dbEntry = await db.imageCache.get(TEST_URL)
    expect(dbEntry).toBeTruthy()
    expect(dbEntry!.dataUrl).toBe(cachedBefore)

    // Re-import to simulate fresh page load (hydrates from Dexie)
    vi.resetModules()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(makePngBlob()),
      })
    )

    const freshModule = await import("./imageCache")

    // Wait for hydration
    await waitForCached(freshModule, TEST_URL)

    expect(freshModule.getCachedUrl(TEST_URL)).toBe(cachedBefore)
  })
})
