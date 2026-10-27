import { base58 } from "@talismn/crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { tabStores } from "../../handlers/stores"
import { keyringStore } from "../keyring/store"
import { requestSolanaSign } from "../signing/requests"
import { SolanaTabsHandler } from "./handler.tabs"

vi.mock("../signing/requests", () => ({
  requestSolanaSign: vi.fn().mockResolvedValue({
    type: "message",
    signature: "signature",
    signedMessage: "signedMessage",
  }),
}))

const SITE_URL = "http://localhost:5600/vault"
const ADDRESS = "7S3P4HxJpyyigGzodYwHtCxZyUQe9JiBMHyRWXArAaKv"

const siwsMessage = (domain: string) =>
  [
    `${domain} wants you to sign in with your Solana account:`,
    ADDRESS,
    "",
    "Signing this grants full control of your Orbinum private funds. Only sign on the official Orbinum app.",
    "",
    "Nonce: orbinumvault1",
    "Issued At: 2026-01-01T00:00:00.000Z",
  ].join("\n")

const signMessage = (text: string) =>
  new SolanaTabsHandler(tabStores).handle(
    "1",
    "pub(solana.provider.signMessage)",
    { address: ADDRESS, message: base58.encode(new TextEncoder().encode(text)) },
    {} as chrome.runtime.Port,
    SITE_URL
  )

describe("solana signMessage (sign-in domain)", () => {
  beforeEach(async () => {
    vi.mocked(requestSolanaSign).mockClear()
    await tabStores.settings.set({ developerMode: false })
    await tabStores.sites.set({
      "localhost:5600": {
        id: "localhost:5600",
        origin: "Orbinum",
        url: SITE_URL,
        addresses: [],
        solAddresses: [ADDRESS],
      },
    })
    vi.spyOn(keyringStore, "getAccount").mockResolvedValue({ address: ADDRESS } as never)
  })

  it("refuses a sign-in for another domain without creating a sign request", async () => {
    await expect(signMessage(siwsMessage("app.orbinum.network"))).rejects.toThrow(
      "The domain in the sign-in message does not match the requesting site"
    )
    expect(requestSolanaSign).not.toHaveBeenCalled()
  })

  it("lets a sign-in for another domain reach the sign request in Developer Mode", async () => {
    await tabStores.settings.set({ developerMode: true })
    await expect(signMessage(siwsMessage("app.orbinum.network"))).resolves.toEqual({
      signature: "signature",
      signedMessage: "signedMessage",
    })
    expect(requestSolanaSign).toHaveBeenCalledOnce()
  })

  it("lets a sign-in for the requesting site reach the sign request", async () => {
    await expect(signMessage(siwsMessage("localhost:5600"))).resolves.toEqual({
      signature: "signature",
      signedMessage: "signedMessage",
    })
    expect(requestSolanaSign).toHaveBeenCalledOnce()
  })

  it("refuses a sign-in that drops the site's port", async () => {
    await expect(signMessage(siwsMessage("localhost"))).rejects.toThrow(
      "The domain in the sign-in message does not match the requesting site"
    )
    expect(requestSolanaSign).not.toHaveBeenCalled()
  })

  it("lets a plain message reach the sign request", async () => {
    await expect(signMessage("app.orbinum.network is not a sign-in")).resolves.toEqual({
      signature: "signature",
      signedMessage: "signedMessage",
    })
    expect(requestSolanaSign).toHaveBeenCalledOnce()
  })

  it("lets a message that quotes a sign-in after its first line reach the sign request", async () => {
    await expect(
      signMessage(`Here is what a sign-in looks like:\n\n${siwsMessage("app.orbinum.network")}`)
    ).resolves.toEqual({ signature: "signature", signedMessage: "signedMessage" })
    expect(requestSolanaSign).toHaveBeenCalledOnce()
  })
})
