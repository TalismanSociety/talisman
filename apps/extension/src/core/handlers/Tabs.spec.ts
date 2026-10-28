import type { EventName } from "@common/analytics/catalogue"
import type { EventProperties } from "@common/analytics/schema"
import { SiwsMessage } from "@talismn/siws"
import { waitFor } from "@testing-library/dom"
import { stringToHex } from "viem"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { keyringStore } from "../domains/keyring/store"
import { requestSubstrateSign } from "../domains/signing/requests"
import { tabStores } from "./stores"
import Tabs from "./Tabs"

type TrackedCall = [event: EventName, props?: EventProperties]

const tracked = vi.hoisted(() => ({ calls: [] as TrackedCall[] }))
vi.mock("../domains/analytics/track", () => ({
  track: (...call: TrackedCall) => {
    tracked.calls.push(call)
  },
}))

vi.mock("../domains/signing/requests", () => ({
  requestSubstrateSign: vi.fn().mockResolvedValue({ id: 1, signature: "0xsignature" }),
  requestVrfSign: vi.fn(),
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

describe("Tabs bytes.sign (sign-in domain)", () => {
  const SITE_URL = "https://app.example.com/login"
  const ADDRESS = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"

  const siwsMessage = (domain: string) =>
    [
      `${domain} wants you to sign in with your Substrate account:`,
      ADDRESS,
      "",
      `URI: https://${domain}`,
      "Version: 1.0.0",
      "Nonce: abcdefgh12",
      "Issued At: 2024-01-01T00:00:00.000Z",
    ].join("\n")

  const siwsJson = (domain: string) =>
    new SiwsMessage({
      domain,
      address: ADDRESS,
      uri: `https://${domain}`,
      version: "1.0.0",
      nonce: "abcdefgh12",
    }).prepareJson()

  const signBytes = (message: string) =>
    new Tabs(tabStores).handle(
      "1",
      "pub(bytes.sign)",
      { address: ADDRESS, data: stringToHex(message), type: "bytes" },
      contentPort(),
      SITE_URL
    )

  beforeEach(async () => {
    vi.mocked(requestSubstrateSign).mockClear()
    await tabStores.app.setOnboarded()
    await tabStores.settings.set({ developerMode: false })
    await tabStores.sites.set({
      "app.example.com": {
        id: "app.example.com",
        origin: "Example",
        url: SITE_URL,
        addresses: [ADDRESS],
      },
    })
    vi.spyOn(keyringStore, "getAccount").mockResolvedValue({ address: ADDRESS } as never)
  })

  it("refuses a sign-in for another domain without creating a sign request", async () => {
    await expect(signBytes(siwsMessage("evil.com"))).rejects.toThrow(
      "The domain in the sign-in message does not match the requesting site"
    )
    expect(requestSubstrateSign).not.toHaveBeenCalled()
  })

  it("refuses a JSON sign-in for another domain without creating a sign request", async () => {
    await expect(signBytes(siwsJson("evil.com"))).rejects.toThrow(
      "The domain in the sign-in message does not match the requesting site"
    )
    expect(requestSubstrateSign).not.toHaveBeenCalled()
  })

  it("lets a sign-in for another domain reach the sign request in Developer Mode", async () => {
    await tabStores.settings.set({ developerMode: true })
    await expect(signBytes(siwsMessage("evil.com"))).resolves.toMatchObject({
      signature: "0xsignature",
    })
    expect(requestSubstrateSign).toHaveBeenCalledOnce()
  })

  it("lets a sign-in for the requesting site reach the sign request", async () => {
    await expect(signBytes(siwsMessage("app.example.com"))).resolves.toMatchObject({
      signature: "0xsignature",
    })
    expect(requestSubstrateSign).toHaveBeenCalledOnce()
  })

  it("lets a plain message reach the sign request", async () => {
    await expect(signBytes("evil.com is not a sign-in")).resolves.toMatchObject({
      signature: "0xsignature",
    })
    expect(requestSubstrateSign).toHaveBeenCalledOnce()
  })

  it("lets a message that quotes a sign-in after its first line reach the sign request", async () => {
    await expect(
      signBytes(`Here is what a sign-in looks like:\n\n${siwsMessage("evil.com")}`)
    ).resolves.toMatchObject({ signature: "0xsignature" })
    expect(requestSubstrateSign).toHaveBeenCalledOnce()
  })

  describe("through extrinsic.sign with a raw payload", () => {
    const signRawAsExtrinsic = (message: string) =>
      new Tabs(tabStores).handle(
        "1",
        "pub(extrinsic.sign)",
        { address: ADDRESS, data: stringToHex(message), type: "bytes" } as never,
        contentPort(),
        SITE_URL
      )

    it("refuses a sign-in for another domain without creating a sign request", async () => {
      await expect(signRawAsExtrinsic(siwsMessage("evil.com"))).rejects.toThrow(
        "The domain in the sign-in message does not match the requesting site"
      )
      expect(requestSubstrateSign).not.toHaveBeenCalled()
    })

    it("refuses a JSON sign-in for another domain without creating a sign request", async () => {
      await expect(signRawAsExtrinsic(siwsJson("evil.com"))).rejects.toThrow(
        "The domain in the sign-in message does not match the requesting site"
      )
      expect(requestSubstrateSign).not.toHaveBeenCalled()
    })

    it("lets a sign-in for the requesting site reach the sign request", async () => {
      await expect(signRawAsExtrinsic(siwsMessage("app.example.com"))).resolves.toMatchObject({
        signature: "0xsignature",
      })
      expect(requestSubstrateSign).toHaveBeenCalledOnce()
    })
  })
})
