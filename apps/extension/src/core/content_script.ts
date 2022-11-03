// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/packages/extension/src/content.ts

import type { Message } from "@polkadot/extension-base/types"
import { PORT_CONTENT } from "@core/constants"
import Browser from "webextension-polyfill"

// connect to the extension
const port = Browser.runtime.connect({ name: PORT_CONTENT })
// send any messages from the extension back to the page
port.onMessage.addListener((data): void => {
  window.postMessage({ ...data, origin: "talisman-content" }, window.location.toString())
})

// all messages from the page, pass them to the extension
window.addEventListener("message", ({ data, source }: Message): void => {
  // listener will also fire on messages from extension to the page
  // only allow messages from our window, by the inject
  if (source !== window || data.origin !== "talisman-page") {
    return
  }

  port.postMessage(data)
})

// inject our data injector
const script = document.createElement("script")
script.src = Browser.runtime.getURL("page.js")
script.async = false
script.onload = () => {
  // remove the injecting tag when loaded
  if (script.parentNode) script.parentNode.removeChild(script)
}

const parent = document.head || document.documentElement
parent.appendChild(script)
