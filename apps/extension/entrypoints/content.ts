// WXT Content Script Entry Point
// Handles communication between injected page script and extension background

import type { Message } from "@polkadot/extension-base/types"
import { PORT_CONTENT } from "extension-shared"

export default defineContentScript({
  matches: ["file://*/*", "http://*/*", "https://*/*"],
  runAt: "document_start",

  main() {
    class PortManager {
      port: chrome.runtime.Port | undefined = undefined

      constructor() {
        this.handleResponse = this.handleResponse.bind(this)
        this.createPort = this.createPort.bind(this)

        // all messages from the page, pass them to the extension
        window.addEventListener("message", ({ data, source }: Message): void => {
          // listener will also fire on messages from extension to the page
          // only allow messages from our window, by the inject
          if (source !== window || data.origin !== "talisman-page") {
            return
          }

          if (!this.port) {
            this.createPort()
          }
          this.port?.postMessage(data)
        })
      }

      createPort() {
        this.port = chrome.runtime.connect({ name: PORT_CONTENT })
        this.port.onMessage.addListener(this.handleResponse)
        const handleDisconnect = () => {
          this.port?.onMessage.removeListener(this.handleResponse)
          this.port?.onDisconnect.removeListener(handleDisconnect)
          this.port = undefined
        }
        this.port.onDisconnect.addListener(handleDisconnect)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handleResponse = (data: any) => {
        window.postMessage({ ...data, origin: "talisman-content" }, window.location.toString())
      }
    }

    new PortManager()

    // inject script that will run in page context
    const script = document.createElement("script")
    script.src = browser.runtime.getURL("/page.js")

    // inject before head element so that it executes before everything else
    const parent = document?.head || document?.documentElement
    parent?.insertBefore(script, parent.children[0])
    parent?.removeChild(script)
  },
})
