import { afterAll, beforeAll, expect, it, vi } from "vitest"

import { db } from "../../../db"
import ParaverseProtector from "./ParaverseProtector"

const mockMetamaskConfig = require("eth-phishing-detect/src/config.json")

const mockFetchWithEtag = vi.fn(async (url: string) => {
  if (url.includes("MetaMask")) {
    return { data: mockMetamaskConfig, etag: "mm-etag-1" }
  }
  if (url.includes("polkadot")) {
    return {
      data: {
        deny: ["badsite.com", "an.other-badsite.io"],
        allow: ["goodsite.com", "polkadot.js.org"],
      },
      etag: "pd-etag-1",
    }
  }
  return null
})

vi.spyOn(ParaverseProtector.prototype, "fetchWithEtag").mockImplementation(mockFetchWithEtag)
const protector = new ParaverseProtector()
// mock fire the ready event on the database
db.on.ready.fire(db)

// Explicitly trigger a refresh so both lists are loaded before assertions.
// In production this happens 30 s after construction via setTimeout.
beforeAll(async () => {
  await protector.isInitialised()
  await protector.setRefreshTimer()
})

it("Checks phishing sites", async () => {
  // in allow lists
  expect(await protector.isPhishingSite("https://www.goodsite.com")).toBeFalsy()
  expect(await protector.isPhishingSite("https://app.talisman.xyz")).toBeFalsy()
  // unlisted subdomain of domain in allow list
  expect(await protector.isPhishingSite("https://fake.talisman.xyz")).toBeFalsy()
  // not listed at all
  expect(await protector.isPhishingSite("https://something.else")).toBeFalsy()
  // in deny list
  expect(await protector.isPhishingSite("https://badsite.com")).toBeTruthy()
  expect(await protector.isPhishingSite("ws://badsite.com")).toBeTruthy()
  expect(await protector.isPhishingSite("https://an.other-badsite.io")).toBeTruthy()
  // unlisted subdomain of domain with another subdomain in deny list
  expect(await protector.isPhishingSite("https://safe.other-badsite.io")).toBeFalsy()
  // unlisted subdomain of domain in deny list
  expect(await protector.isPhishingSite("https://not-in-list.badsite.com")).toBeTruthy()

  // not a url
  expect(await protector.isPhishingSite("some garbage")).toBeFalsy()
})

it("Can add an exception to phishing sites", async () => {
  const badsite = "https://badsite.com"
  expect(await protector.isPhishingSite(badsite)).toBeTruthy()
  protector.addException(badsite)
  expect(await protector.isPhishingSite(badsite)).toBeFalsy()
})

it("Skips update when fetchWithEtag returns null (304)", async () => {
  mockFetchWithEtag.mockResolvedValueOnce(null).mockResolvedValueOnce(null)
  // Should not throw, and lists should remain unchanged
  await protector.setRefreshTimer()
  expect(await protector.isPhishingSite("https://badsite.com")).toBeFalsy() // was excepted above
})

it("Rejects invalid MetaMask config gracefully", async () => {
  mockFetchWithEtag.mockImplementation(async (url: string) => {
    if (url.includes("MetaMask")) {
      return { data: { broken: true }, etag: "bad-etag" }
    }
    return null
  })
  // Should not throw — invalid data is logged and skipped
  await protector.refreshMetamaskList()
  // Protector should still work with previous data
  expect(await protector.isPhishingSite("https://something.else")).toBeFalsy()
})

it("Rejects invalid Polkadot list gracefully", async () => {
  mockFetchWithEtag.mockImplementation(async (url: string) => {
    if (url.includes("polkadot")) {
      return { data: "not-an-object", etag: "bad-etag" }
    }
    return null
  })
  await protector.refreshPolkadotList()
  expect(await protector.isPhishingSite("https://something.else")).toBeFalsy()
})

afterAll(() => {
  vi.clearAllMocks()
})
