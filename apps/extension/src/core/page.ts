// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/packages/extension-base/src/page.ts
import type { Message } from "@polkadot/extension-base/types"

import { DEBUG, TALISMAN_WEB_APP_DOMAIN } from "./constants"
import TalismanInjected from "./inject/Injected"
import { injectExtension } from "./inject/injectExtension"
import type { Injected, InjectedExtensionInfo } from "./inject/types"
import { injectEthereum } from "./injectEth/injectEthereum"
import MessageService from "./libs/MessageService"
import { urlToDomain } from "./util/urlToDomain"

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
const redirectIfPhishing = () => messageService.sendMessage("pub(phishing.redirectIfDenied)")

// the enable function, called by the dapp to allow access
const enable = async (origin: string): Promise<Injected> => {
  await messageService.sendMessage("pub(authorize.tab)", { origin })

  // Pretend that the TalismanInjected object is an Injected object (v. similar) to make the injectExtension work
  // Pretty sure there is a bug in Polkadot.js's typings which means this is required
  // Could cause problems if TalismanInjected diverges from Injected
  return new TalismanInjected(messageService.sendMessage) as Injected
}

const injectOptions: InjectedExtensionInfo = {
  name: "talisman",
  version: process.env.VERSION ?? "",
}

const { val: domain, ok } = urlToDomain(window.location.pathname)
if (ok && domain === TALISMAN_WEB_APP_DOMAIN) injectOptions.authorised = true

function inject() {
  // inject substrate wallet provider
  injectExtension(enable, injectOptions)

  injectEthereum(messageService.sendMessage)
}

inject()
redirectIfPhishing()
