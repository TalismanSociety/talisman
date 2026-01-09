// Page script - injected into web pages for dApp interaction

import type { Message } from "@polkadot/extension-base/types"
import { DEBUG, isTalismanHostname } from "extension-shared"

import type { Injected } from "../src/inject/substrate/types"
import WindowMessageService from "../src/common/WindowMessageService"
import { injectEthereum } from "../src/inject/ethereum/injectEthereum"
import { injectSolana } from "../src/inject/solana/injectSolana"
import TalismanInjected from "../src/inject/substrate/Injected"
import { injectExtension } from "../src/inject/substrate/injectExtension"
import { injectSubstrate } from "../src/inject/substrate/injectSubstrate"

export default defineUnlistedScript(() => {
  const messageService = new WindowMessageService()

  // setup a response listener (events created by the loader for extension responses)
  window.addEventListener("message", ({ data, source }: Message): void => {
    // only allow messages from our window, by the loader
    if (source !== window || data.origin !== "talisman-content") return

    if (data.id) messageService.handleResponse(data)
    // eslint-disable-next-line no-console
    else if (DEBUG) console.error("Missing id for response", { data })
  })

  // redirect users if this page is considered as phishing, otherwise return false
  const redirectIfPhishing = () => messageService.sendMessage("pub(phishing.redirectIfDenied)")

  // the enable function, called by the dapp to allow access
  const enable = async (origin: string): Promise<Injected> => {
    await messageService.sendMessage("pub(authorize.tab)", { origin, provider: "polkadot" })

    // Pretend that the TalismanInjected object is an Injected object (v. similar) to make the injectExtension work
    // Pretty sure there is a bug in Polkadot.js's typings which means this is required
    // Could cause problems if TalismanInjected diverges from Injected
    return new TalismanInjected(messageService.sendMessage) as Injected
  }

  function inject() {
    // inject substrate wallet provider
    injectExtension(enable, {
      name: "talisman",
      version: process.env.VERSION ?? "",
    })

    injectEthereum(messageService.sendMessage)
    injectSolana(messageService.sendMessage)

    if (isTalismanHostname(window.location.hostname)) injectSubstrate(messageService.sendMessage)
  }

  inject()
  redirectIfPhishing()
})
