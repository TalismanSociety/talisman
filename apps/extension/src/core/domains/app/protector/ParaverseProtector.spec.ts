import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest"

const mockBlobStores = vi.hoisted(() => new Map<string, unknown>())

const mockMetamaskStalelist = {
  data: {
    allowlist: ["polkadot.js.org"],
    blocklist: ["badsite.com", "an.other-badsite.io"],
    blocklistPaths: ["sites.google.com/view/1incha", "sites.google.com/view/other-phish"],
    fuzzylist: [],
    tolerance: 2,
    version: 1,
  },
}

// Mock the blob store so no real IndexedDB is needed (hoisted before imports)
vi.mock("../../../db/blobs", () => {
  return {
    getBlobStore: vi.fn((id: string) => ({
      set: vi.fn(async (data: unknown) => {
        mockBlobStores.set(id, data)
      }),
      get: vi.fn(async () => mockBlobStores.get(id) ?? null),
    })),
  }
})

// Mock fetch globally
const mockFetch = vi.fn<typeof fetch>()
vi.stubGlobal("fetch", mockFetch)

function fetchInputToString(input: Parameters<typeof fetch>[0]) {
  return typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
}

function setDefaultFetchResponses() {
  mockFetch.mockImplementation(async (input) => {
    const url = fetchInputToString(input)
    if (url.includes("metamask")) {
      return new Response(JSON.stringify(mockMetamaskStalelist), {
        status: 200,
        headers: { etag: "mm-etag-1" },
      })
    }
    if (url.includes("polkadot")) {
      return new Response(
        JSON.stringify({
          deny: ["badsite.com", "an.other-badsite.io"],
          allow: ["goodsite.com", "polkadot.js.org"],
        }),
        { status: 200, headers: { etag: "pd-etag-1" } }
      )
    }
    return new Response("", { status: 404 })
  })
}

function setHangingFetchResponses() {
  mockFetch.mockImplementation((_input, init) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener(
        "abort",
        () => reject(new DOMException("Aborted", "AbortError")),
        { once: true }
      )
    })
  })
}

setDefaultFetchResponses()

import { addException, dispose, isPhishingSite, refreshPhishingLists } from "./ParaverseProtector"

// Explicitly trigger a refresh so both lists are loaded before assertions.
beforeAll(async () => {
  await refreshPhishingLists()
})

afterEach(() => {
  setDefaultFetchResponses()
})

it("Checks phishing sites", async () => {
  // in allow lists
  expect(await isPhishingSite("https://www.goodsite.com")).toBeFalsy()
  expect(await isPhishingSite("https://app.talisman.xyz")).toBeFalsy()
  // unlisted subdomain of domain in allow list
  expect(await isPhishingSite("https://fake.talisman.xyz")).toBeFalsy()
  // not listed at all
  expect(await isPhishingSite("https://something.else")).toBeFalsy()
  // in deny list
  expect(await isPhishingSite("https://badsite.com")).toBeTruthy()
  expect(await isPhishingSite("ws://badsite.com")).toBeTruthy()
  expect(await isPhishingSite("https://an.other-badsite.io")).toBeTruthy()
  // unlisted subdomain of domain with another subdomain in deny list
  expect(await isPhishingSite("https://safe.other-badsite.io")).toBeFalsy()
  // unlisted subdomain of domain in deny list
  expect(await isPhishingSite("https://not-in-list.badsite.com")).toBeTruthy()
  // path-specific deny list entry on a shared host
  expect(await isPhishingSite("https://sites.google.com/view/1incha")).toBeTruthy()
  expect(await isPhishingSite("https://sites.google.com/view/legit")).toBeFalsy()

  // not a url
  expect(await isPhishingSite("some garbage")).toBeFalsy()
})

it("Refreshes immediately before the first check when no valid MetaMask cache exists", async () => {
  dispose()
  mockBlobStores.clear()
  setDefaultFetchResponses()
  mockFetch.mockClear()

  expect(await isPhishingSite("https://badsite.com")).toBeTruthy()
  expect(
    mockFetch.mock.calls.some(([input]) => fetchInputToString(input).includes("metamask"))
  ).toBe(true)
})

it("Times out the first refresh and falls back to the bundled list", async () => {
  dispose()
  mockBlobStores.clear()
  setHangingFetchResponses()
  vi.useFakeTimers()

  try {
    const check = isPhishingSite("https://metamask-login.typedream.app")
    await vi.advanceTimersByTimeAsync(15_000)

    await expect(check).resolves.toBeTruthy()
  } finally {
    dispose()
    vi.useRealTimers()
  }
})

it("Does not re-arm refresh timers after dispose", async () => {
  dispose()
  mockBlobStores.clear()
  setHangingFetchResponses()
  vi.useFakeTimers()

  try {
    const check = isPhishingSite("https://something.else")
    await vi.advanceTimersByTimeAsync(0)

    dispose()

    await expect(check).resolves.toBeFalsy()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    dispose()
    vi.useRealTimers()
  }
})

it("Can add an exception to phishing sites", async () => {
  const badsite = "https://badsite.com"
  expect(await isPhishingSite(badsite)).toBeTruthy()
  addException(badsite)
  expect(await isPhishingSite(badsite)).toBeFalsy()
})

it("Scopes path-specific exceptions to the exact URL without query or fragment", async () => {
  dispose()
  mockBlobStores.clear()
  setDefaultFetchResponses()

  const blockedPath = "https://sites.google.com/view/1incha?ref=from-link#section"
  expect(await isPhishingSite(blockedPath)).toBeTruthy()

  addException(blockedPath)

  expect(await isPhishingSite("https://sites.google.com/view/1incha?ref=another-link")).toBeFalsy()
  expect(await isPhishingSite("https://sites.google.com/view/other-phish")).toBeTruthy()
})

it("Skips update when fetch returns 304", async () => {
  addException("https://badsite.com")
  mockFetch.mockResolvedValue(new Response(null, { status: 304 }))
  await refreshPhishingLists()
  // badsite.com was excepted before refresh — should remain so
  expect(await isPhishingSite("https://badsite.com")).toBeFalsy()
})

it("Rejects invalid MetaMask config gracefully", async () => {
  mockFetch.mockImplementation(async (input) => {
    const url = fetchInputToString(input)
    if (url.includes("metamask")) {
      return new Response(JSON.stringify({ broken: true }), {
        status: 200,
        headers: { etag: "bad-etag" },
      })
    }
    return new Response(null, { status: 304 })
  })
  await refreshPhishingLists()
  expect(await isPhishingSite("https://something.else")).toBeFalsy()
})

it("Rejects invalid Polkadot list gracefully", async () => {
  mockFetch.mockImplementation(async (input) => {
    const url = fetchInputToString(input)
    if (url.includes("polkadot")) {
      return new Response(JSON.stringify("not-an-object"), {
        status: 200,
        headers: { etag: "bad-etag" },
      })
    }
    return new Response(null, { status: 304 })
  })
  await refreshPhishingLists()
  expect(await isPhishingSite("https://something.else")).toBeFalsy()
})

afterAll(() => {
  dispose()
  vi.restoreAllMocks()
})
