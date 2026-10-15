import type { EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import { waitFor } from "@testing-library/dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { tabStores } from "./stores"
import Tabs from "./Tabs"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => ({ calls: [] as TrackedCall[] }))
vi.mock("../domains/analytics/track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

const PHISHING_URL = "https://wallet-airdrop.example/claim"

vi.mock("../domains/app/protector", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../domains/app/protector")>()),
  getPhishingSource: async (url: string) => (url === PHISHING_URL ? "lists" : undefined),
}))

const contentPort = () => ({ name: "talisman-content" }) as chrome.runtime.Port

describe("Tabs phishing redirect", () => {
  beforeEach(async () => {
    tracked.calls = []
    await tabStores.app.setOnboarded()
    vi.spyOn(chrome.tabs, "query").mockResolvedValue([
      { id: 1, url: PHISHING_URL } as chrome.tabs.Tab,
    ])
    vi.spyOn(chrome.tabs, "update").mockResolvedValue(undefined)
  })

  it("reports a blocked page once per content port, however many messages the page sends", async () => {
    const tabs = new Tabs(tabStores)
    const firstPage = contentPort()
    const secondPage = contentPort()

    const results = await Promise.all([
      tabs.handle("1", "pub(phishing.redirectIfDenied)", null, firstPage, PHISHING_URL),
      tabs.handle("2", "pub(eth.request)", { method: "eth_chainId" }, firstPage, PHISHING_URL),
      tabs.handle("3", "pub(phishing.redirectIfDenied)", null, secondPage, PHISHING_URL),
    ])

    expect(results).toEqual([true, undefined, true])
    expect(tracked.calls).toEqual([
      ["phishing_site_blocked", { protection_source: "lists" }],
      ["phishing_site_blocked", { protection_source: "lists" }],
    ])
    await waitFor(() => expect(chrome.tabs.update).toHaveBeenCalledTimes(2))
  })
})
