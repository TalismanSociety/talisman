// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/packages/extension/src/content.ts

import { PORT_CONTENT } from "@extension/shared"
import type { Message } from "@polkadot/extension-base/types"

// connect to the extension
const port = chrome.runtime.connect({ name: PORT_CONTENT })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const messageHandler = (data: any) => {
  window.postMessage({ ...data, origin: "talisman-content" }, window.location.toString())
}

// send any messages from the extension back to the page
port.onMessage.addListener(messageHandler)

// handle port disconnection
const disconnectHandler = () => {
  port.onMessage.removeListener(messageHandler)
  port.onDisconnect.removeListener(disconnectHandler)
}

port.onDisconnect.addListener(disconnectHandler)

// all messages from the page, pass them to the extension
window.addEventListener("message", ({ data, source }: Message): void => {
  // listener will also fire on messages from extension to the page
  // only allow messages from our window, by the inject
  if (source !== window || data.origin !== "talisman-page") {
    return
  }

  port.postMessage(data)
})

// inject script that will run in page context, content inlined for instant execution
const script = document.createElement("script")
script.src = chrome.runtime.getURL("page.js")

// inject before head element so that it executes before everything else
const parent = document?.head || document?.documentElement
parent?.insertBefore(script, parent.children[0])
parent?.removeChild(script)
