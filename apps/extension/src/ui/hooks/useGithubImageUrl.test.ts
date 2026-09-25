import { afterEach, describe, expect, it, vi } from "vitest"

// stub imageCache to avoid pulling the Dexie-backed SWR cache into these unit tests
vi.mock("./imageCache", () => ({
  invalidateCachedImage: vi.fn(),
  useImageSwr: () => null,
}))

const FALLBACK = "/images/token-placeholder.svg"

const GITRAW_SIMPLE =
  "https://raw.githubusercontent.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg"
const JSDELIVR_SIMPLE =
  "https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@main/assets/tokens/dot.svg"

// branch name contains a slash: the ref/path boundary cannot be inferred from the url,
// so the whole {ref}/{path} part must be carried over verbatim between sources
const GITRAW_SLASHED =
  "https://raw.githubusercontent.com/TalismanSociety/chaindata/feat/my-branch/assets/tokens/dot.svg"
const JSDELIVR_SLASHED =
  "https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@feat/my-branch/assets/tokens/dot.svg"

// real-world example: refs may contain more than one slash
const GITRAW_MULTI_SLASHED =
  "https://raw.githubusercontent.com/TalismanSociety/chaindata/archived/feat/split-entities/assets/tokens/dot.svg"
const JSDELIVR_MULTI_SLASHED =
  "https://cdn.jsdelivr.net/gh/TalismanSociety/chaindata@archived/feat/split-entities/assets/tokens/dot.svg"

const loadGetFileUrl = async (debug: boolean) => {
  vi.resetModules()
  vi.doMock("@common/constants", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@common/constants")>()),
    DEBUG: debug,
  }))
  const { getFileUrl } = await import("./useGithubImageUrl")
  return getFileUrl
}

afterEach(() => {
  vi.doUnmock("@common/constants")
})

describe("useGithubImageUrl / getFileUrl (production flow: jsdelivr -> gitraw)", () => {
  it("returns fallback for nullish or fallback input", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl(null, FALLBACK)).toBe(FALLBACK)
    expect(getFileUrl(undefined, FALLBACK)).toBe(FALLBACK)
    expect(getFileUrl(FALLBACK, FALLBACK)).toBe(FALLBACK)
  })

  it("keeps non-github urls as-is, with fallback as only rotation", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl("https://example.com/logo.png", FALLBACK)).toBe(
      "https://example.com/logo.png"
    )
    expect(getFileUrl("https://example.com/logo.png", FALLBACK, true)).toBe(FALLBACK)
  })

  it("normalizes gitraw urls to jsdelivr on first render", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl(GITRAW_SIMPLE, FALLBACK)).toBe(JSDELIVR_SIMPLE)
  })

  it("keeps jsdelivr urls on jsdelivr on first render", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl(JSDELIVR_SIMPLE, FALLBACK)).toBe(JSDELIVR_SIMPLE)
  })

  it("rotates jsdelivr -> gitraw -> fallback on errors", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl(JSDELIVR_SIMPLE, FALLBACK, true)).toBe(GITRAW_SIMPLE)
    expect(getFileUrl(GITRAW_SIMPLE, FALLBACK, true)).toBe(FALLBACK)
  })

  it("supports branch names containing a slash", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    // normalize to jsdelivr, keeping the slashed ref verbatim
    expect(getFileUrl(GITRAW_SLASHED, FALLBACK)).toBe(JSDELIVR_SLASHED)

    // lossless round-trip back to the exact original gitraw url on rotation
    expect(getFileUrl(JSDELIVR_SLASHED, FALLBACK, true)).toBe(GITRAW_SLASHED)
    expect(getFileUrl(GITRAW_SLASHED, FALLBACK, true)).toBe(FALLBACK)
  })

  it("supports branch names containing multiple slashes", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl(GITRAW_MULTI_SLASHED, FALLBACK)).toBe(JSDELIVR_MULTI_SLASHED)
    expect(getFileUrl(JSDELIVR_MULTI_SLASHED, FALLBACK, true)).toBe(GITRAW_MULTI_SLASHED)
  })

  it("normalizes legacy statically urls (both separators) to jsdelivr", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(
      getFileUrl(
        "https://cdn.statically.io/gh/TalismanSociety/chaindata/main/assets/tokens/dot.svg",
        FALLBACK
      )
    ).toBe(JSDELIVR_SIMPLE)
    expect(
      getFileUrl(
        "https://cdn.statically.io/gh/TalismanSociety/chaindata@main/assets/tokens/dot.svg",
        FALLBACK
      )
    ).toBe(JSDELIVR_SIMPLE)
  })

  it("normalizes legacy githack urls to jsdelivr, including slashed refs", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(
      getFileUrl(
        "https://rawcdn.githack.com/TalismanSociety/chaindata/main/assets/tokens/dot.svg",
        FALLBACK
      )
    ).toBe(JSDELIVR_SIMPLE)
    expect(
      getFileUrl(
        "https://rawcdn.githack.com/TalismanSociety/chaindata/feat/my-branch/assets/tokens/dot.svg",
        FALLBACK
      )
    ).toBe(JSDELIVR_SLASHED)
  })

  it("restarts the flow from the preferred source when rotating a legacy url", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(
      getFileUrl(
        "https://cdn.statically.io/gh/TalismanSociety/chaindata/main/assets/tokens/dot.svg",
        FALLBACK,
        true
      )
    ).toBe(JSDELIVR_SIMPLE)
  })
})

describe("useGithubImageUrl / getFileUrl (debug flow: gitraw -> jsdelivr)", () => {
  it("keeps gitraw urls on gitraw on first render", async () => {
    const getFileUrl = await loadGetFileUrl(true)

    expect(getFileUrl(GITRAW_SIMPLE, FALLBACK)).toBe(GITRAW_SIMPLE)
    expect(getFileUrl(GITRAW_SLASHED, FALLBACK)).toBe(GITRAW_SLASHED)
  })

  it("normalizes jsdelivr urls to gitraw on first render", async () => {
    const getFileUrl = await loadGetFileUrl(true)

    expect(getFileUrl(JSDELIVR_SIMPLE, FALLBACK)).toBe(GITRAW_SIMPLE)
  })

  it("rotates gitraw -> jsdelivr -> fallback on errors, keeping slashed refs verbatim", async () => {
    const getFileUrl = await loadGetFileUrl(true)

    expect(getFileUrl(GITRAW_SLASHED, FALLBACK, true)).toBe(JSDELIVR_SLASHED)
    expect(getFileUrl(JSDELIVR_SLASHED, FALLBACK, true)).toBe(FALLBACK)
  })
})

describe("useGithubImageUrl / getFileUrl (no fallback)", () => {
  it("returns undefined for nullish input", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl(null)).toBeUndefined()
    expect(getFileUrl(undefined)).toBeUndefined()
  })

  it("rotates through every source then ends on undefined", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl(GITRAW_SIMPLE)).toBe(JSDELIVR_SIMPLE)
    expect(getFileUrl(JSDELIVR_SIMPLE, undefined, true)).toBe(GITRAW_SIMPLE)
    expect(getFileUrl(GITRAW_SIMPLE, undefined, true)).toBeUndefined()
  })

  it("drops non-github urls on rotation", async () => {
    const getFileUrl = await loadGetFileUrl(false)

    expect(getFileUrl("https://example.com/logo.png")).toBe("https://example.com/logo.png")
    expect(getFileUrl("https://example.com/logo.png", undefined, true)).toBeUndefined()
  })
})
