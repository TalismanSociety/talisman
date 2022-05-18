// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/packages/extension-base/src/page.ts
import type { Message } from "@polkadot/extension-base/types"

import MessageService from "./libs/MessageService"
import { injectExtension } from "./inject/injectExtension"
import TalismanInjected from "./inject/Injected"
import { Injected } from "./inject/types"
import * as Sentry from "@sentry/browser"
import { TalismanEthProvider } from "./injectEth/TalismanEthProvider"
import { TalismanWindow } from "./injectEth/types"

const messageService = new MessageService({
  origin: "talisman-page",
})

// setup a response listener (events created by the loader for extension responses)
window.addEventListener("message", ({ data, source }: Message): void => {
  // only allow messages from our window, by the loader
  if (source !== window || data.origin !== "talisman-content") return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (data.id) messageService.handleResponse(data as any)
  else Sentry.captureException(new Error("Missing id for response."), { tags: { ...data } })
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
  injectExtension(enable, {
    name: "talisman",
    version: process.env.VERSION || "",
  })

  const provider = new TalismanEthProvider(messageService.sendMessage)

  const talismanWindow = window as TalismanWindow
  talismanWindow.talismanEth = provider

  // inject on window.ethereum if it is not defined
  // this allows users to disable metamask and test talisman easily without doing any changes on dapps
  if (typeof talismanWindow.ethereum === "undefined") {
    // eslint-disable-next-line no-console
    console.debug("Injecting talismanEth in window.ethereum")
    talismanWindow.ethereum = provider
  }
}

inject()
redirectIfPhishing()
