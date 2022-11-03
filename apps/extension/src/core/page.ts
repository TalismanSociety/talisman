// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/packages/extension-base/src/page.ts
import type { Message } from "@polkadot/extension-base/types"

import { DEBUG } from "./constants"
import TalismanInjected from "./inject/Injected"
import { injectExtension } from "./inject/injectExtension"
import { Injected } from "./inject/types"
import { TalismanEthProvider } from "./injectEth/TalismanEthProvider"
import MessageService from "./libs/MessageService"
import { log } from "./log"
import { logProxy } from "./log/logProxy"

declare global {
  interface Window {
    ethereum: any
    talismanEth: any
  }
}

const messageService = new MessageService({
  origin: "talisman-page",
})

// setup a response listener (events created by the loader for extension responses)
window.addEventListener("message", ({ data, source }: Message): void => {
  // only allow messages from our window, by the loader
  if (source !== window || data.origin !== "talisman-content") return

  if (data.id) messageService.handleResponse(data)
  // eslint-disable-next-line no-console
  else if (DEBUG) console.error("Missing id for response", { data })
})

// redirect users if this page is considered as phishing, otherwise return false
const redirectIfPhishing = async (): Promise<boolean> => {
  const res = await messageService.sendMessage("pub(phishing.redirectIfDenied)")
  return res
}

// the enable function, called by the dapp to allow access
const enable = async (origin: string): Promise<Injected> => {
  await messageService.sendMessage("pub(authorize.tab)", { origin })

  // Pretend that the TalismanInjected object is an Injected object (v. similar) to make the injectExtension work
  // Pretty sure there is a bug in Polkadot.js's typings which means this is required
  // Could cause problems if TalismanInjected diverges from Injected
  return new TalismanInjected(messageService.sendMessage) as Injected
}

function inject() {
  // inject substrate wallet provider
  injectExtension(enable, {
    name: "talisman",
    version: process.env.VERSION ? process.env.VERSION : "",
  })

  // inject ethereum wallet provider
  const provider = new TalismanEthProvider(messageService.sendMessage)

  window.talismanEth = provider

  // also inject on window.ethereum if it is not defined
  // this allows users to just disable metamask if they want to use Talisman instead
  if (typeof window.ethereum === "undefined") {
    // eslint-disable-next-line no-console
    console.debug("Injecting talismanEth in window.ethereum")
    window.ethereum = provider
  }

  if (process.env.EVM_LOGPROXY === "true") {
    log.log("wrapping %s in logProxy", window.ethereum.isTalisman ? "Talisman" : "MetaMask")
    window.ethereum = logProxy(window.ethereum)
  }
}

inject()
redirectIfPhishing()
