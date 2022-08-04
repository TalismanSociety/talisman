// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/packages/extension-base/src/page.ts
import type { Message } from "@polkadot/extension-base/types"
import * as Sentry from "@sentry/browser"

import { DEBUG } from "./constants"
import TalismanInjected from "./inject/Injected"
import { injectExtension } from "./inject/injectExtension"
import { Injected } from "./inject/types"
import { TalismanEthProvider } from "./injectEth/TalismanEthProvider"
import { TalismanWindow } from "./injectEth/types"
import MessageService from "./libs/MessageService"
import { logProxy } from "./log/logProxy"

const messageService = new MessageService({
  origin: "talisman-page",
})

// setup a response listener (events created by the loader for extension responses)
window.addEventListener("message", ({ data, source }: Message): void => {
  // only allow messages from our window, by the loader
  if (source !== window || data.origin !== "talisman-content") return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (data.id) messageService.handleResponse(data as any)
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
    version: process.env.VERSION || "",
  })

  // inject ethereum wallet provider
  const provider = new TalismanEthProvider(messageService.sendMessage)
  const evmInjected = DEBUG && process.env.EVM_LOGPROXY === "true" ? logProxy(provider) : provider

  const talismanWindow = window as TalismanWindow
  talismanWindow.talismanEth = evmInjected

  // inject on window.ethereum if it is not defined
  // this allows users to just disable metamask to use Talisman instead
  if (typeof talismanWindow.ethereum === "undefined") {
    // eslint-disable-next-line no-console
    console.debug("Injecting talismanEth in window.ethereum")
    talismanWindow.ethereum = evmInjected
  }
}

inject()
redirectIfPhishing()
