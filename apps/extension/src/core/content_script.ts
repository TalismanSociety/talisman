// Copyright 2019-2021 @polkadot/extension authors & contributors
// SPDX-License-Identifier: Apache-2.0

// Adapted from https://github.com/polkadot-js/extension/packages/extension/src/content.ts

import type { Message } from "@polkadot/extension-base/types"
import { PORT_CONTENT } from "extension-shared"
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

// inject script that will run in page context, content inlined for instant execution
const script = document.createElement("script")
script.textContent = "#TALISMAN_PAGE_SCRIPT#"

// inject before head element so that it executes before everything else
const parent = document?.head || document?.documentElement
parent?.insertBefore(script, parent.children[0])
parent?.removeChild(script)
