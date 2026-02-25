import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest"

const mockMetamaskConfig = require("eth-phishing-detect/src/config.json")

// Mock the blob store so no real IndexedDB is needed (hoisted before imports)
vi.mock("../../../db/blobs", () => {
  const stores = new Map<string, unknown>()
  return {
    getBlobStore: vi.fn((id: string) => ({
      set: vi.fn(async (data: unknown) => {
        stores.set(id, data)
      }),
      get: vi.fn(async () => stores.get(id) ?? null),
    })),
  }
})

// Mock fetch globally
const mockFetch = vi.fn<typeof fetch>()
vi.stubGlobal("fetch", mockFetch)

function setDefaultFetchResponses() {
  mockFetch.mockImplementation(async (input) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    if (url.includes("MetaMask")) {
      return new Response(JSON.stringify(mockMetamaskConfig), {
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

setDefaultFetchResponses()

import { db } from "../../../db"
import { addException, isPhishingSite, refreshPhishingLists } from "./ParaverseProtector"

// mock fire the ready event on the database
db.on.ready.fire(db)

// Explicitly trigger a refresh so both lists are loaded before assertions.
// In production this happens 30 s after module load via timer().
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

  // not a url
  expect(await isPhishingSite("some garbage")).toBeFalsy()
})

it("Can add an exception to phishing sites", async () => {
  const badsite = "https://badsite.com"
  expect(await isPhishingSite(badsite)).toBeTruthy()
  addException(badsite)
  expect(await isPhishingSite(badsite)).toBeFalsy()
})

it("Skips update when fetch returns 304", async () => {
  mockFetch.mockResolvedValue(new Response(null, { status: 304 }))
  await refreshPhishingLists()
  // badsite.com was excepted above — should remain so
  expect(await isPhishingSite("https://badsite.com")).toBeFalsy()
})

it("Rejects invalid MetaMask config gracefully", async () => {
  mockFetch.mockImplementation(async (input) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
    if (url.includes("MetaMask")) {
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
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
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
  vi.restoreAllMocks()
})
