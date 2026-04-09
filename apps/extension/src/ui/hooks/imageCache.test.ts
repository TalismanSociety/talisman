import { db } from "@core/db"
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

const TEST_URL = "https://example.com/logo.png"

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

  it("returns null for uncached URL", () => {
    expect(imageCache.getCachedUrl(TEST_URL)).toBeNull()
  })

  it("fetches and caches a URL on ensureCached", async () => {
    expect(imageCache.getCachedUrl(TEST_URL)).toBeNull()

    imageCache.ensureCached(TEST_URL)

    // Wait for the async fetch + cache pipeline to settle
    await vi.waitFor(() => {
      expect(imageCache.getCachedUrl(TEST_URL)).not.toBeNull()
    })

    const cached = imageCache.getCachedUrl(TEST_URL)
    expect(cached).toMatch(/^data:image\/png;base64,/)
  })

  it("does not re-fetch if URL is already cached and fresh", async () => {
    imageCache.ensureCached(TEST_URL)

    await vi.waitFor(() => {
      expect(imageCache.getCachedUrl(TEST_URL)).not.toBeNull()
    })

    const fetchMock = vi.mocked(fetch)
    const callCount = fetchMock.mock.calls.length

    // Second call should be a no-op
    imageCache.ensureCached(TEST_URL)

    // Give any potential async work time to execute
    await new Promise((r) => setTimeout(r, 50))

    expect(fetchMock).toHaveBeenCalledTimes(callCount)
  })

  it("skips blobs that are not images", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob(["not an image"], { type: "text/plain" })),
    } as Response)

    imageCache.ensureCached("https://example.com/text.txt")

    await new Promise((r) => setTimeout(r, 100))

    expect(imageCache.getCachedUrl("https://example.com/text.txt")).toBeNull()
  })

  it("skips blobs that exceed size limit", async () => {
    const bigBlob = new Blob([new Uint8Array(200_000)], { type: "image/png" })
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(bigBlob),
    } as Response)

    imageCache.ensureCached("https://example.com/huge.png")

    await new Promise((r) => setTimeout(r, 100))

    expect(imageCache.getCachedUrl("https://example.com/huge.png")).toBeNull()
  })

  it("handles fetch failures gracefully", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

    imageCache.ensureCached("https://example.com/fail.png")

    await new Promise((r) => setTimeout(r, 100))

    expect(imageCache.getCachedUrl("https://example.com/fail.png")).toBeNull()
  })

  it("handles non-ok responses gracefully", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      blob: () => Promise.resolve(makePngBlob()),
    } as Response)

    imageCache.ensureCached("https://example.com/404.png")

    await new Promise((r) => setTimeout(r, 100))

    expect(imageCache.getCachedUrl("https://example.com/404.png")).toBeNull()
  })

  it("deduplicates concurrent fetches for the same URL", async () => {
    imageCache.ensureCached(TEST_URL)
    imageCache.ensureCached(TEST_URL)
    imageCache.ensureCached(TEST_URL)

    await vi.waitFor(() => {
      expect(imageCache.getCachedUrl(TEST_URL)).not.toBeNull()
    })

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it("rejects http:// URLs", async () => {
    const httpUrl = "http://example.com/logo.png"
    imageCache.ensureCached(httpUrl)

    await new Promise((r) => setTimeout(r, 100))

    expect(imageCache.getCachedUrl(httpUrl)).toBeNull()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("rejects URLs that fail isSafeImageUrl", async () => {
    const unsafeUrl = "https://example.com/script.js"
    imageCache.ensureCached(unsafeUrl)

    await new Promise((r) => setTimeout(r, 100))

    expect(imageCache.getCachedUrl(unsafeUrl)).toBeNull()
    expect(vi.mocked(fetch)).not.toHaveBeenCalled()
  })

  it("hydration does not overwrite fresher in-memory entries", async () => {
    // First, cache a fresh entry via network fetch
    imageCache.ensureCached(TEST_URL)
    await vi.waitFor(() => {
      expect(imageCache.getCachedUrl(TEST_URL)).not.toBeNull()
    })

    const freshDataUrl = imageCache.getCachedUrl(TEST_URL)

    // Now put a stale entry into the DB (simulating an older DB row)
    const staleEntry = { url: TEST_URL, dataUrl: "data:image/png;base64,STALE", fetchedAt: 1000 }
    await db.imageCache.put(staleEntry)

    // Re-import to trigger hydration
    vi.resetModules()
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(makePngBlob()),
      })
    )

    const freshModule = await import("./imageCache")

    // Trigger a fresh fetch that completes before hydration finishes
    freshModule.ensureCached(TEST_URL)
    await vi.waitFor(() => {
      expect(freshModule.getCachedUrl(TEST_URL)).not.toBeNull()
    })

    const afterHydration = freshModule.getCachedUrl(TEST_URL)
    // The fresher network fetch should not be overwritten by stale DB data
    expect(afterHydration).not.toBe("data:image/png;base64,STALE")
    expect(afterHydration).toMatch(/^data:image\/png;base64,/)
    // The fresh data URL from the network fetch should be preserved
    expect(afterHydration).toBe(freshDataUrl)
  })

  it("persists to and hydrates from Dexie", async () => {
    // Cache an entry
    imageCache.ensureCached(TEST_URL)
    await vi.waitFor(() => {
      expect(imageCache.getCachedUrl(TEST_URL)).not.toBeNull()
    })

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
    await vi.waitFor(() => {
      expect(freshModule.getCachedUrl(TEST_URL)).not.toBeNull()
    })

    expect(freshModule.getCachedUrl(TEST_URL)).toBe(cachedBefore)
  })
})
