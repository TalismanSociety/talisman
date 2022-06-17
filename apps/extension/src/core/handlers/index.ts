import { PORT_EXTENSION, DEBUG } from "@core/constants"
import type { MessageTypes, TransportRequestMessage } from "core/types"
import { assert } from "@polkadot/util"
import { Runtime } from "webextension-polyfill"
import * as Sentry from "@sentry/browser"

import TalismanState from "./State"
import Extension from "./Extension"
import Tabs from "./Tabs"
import { tabStores, extensionStores } from "./stores"
import { EthProviderRpcError } from "@core/injectEth/types"

const state = new TalismanState()
const extension = new Extension(state, extensionStores)
const tabs = new Tabs(state, tabStores)

const talismanHandler = <TMessageType extends MessageTypes>(
  data: TransportRequestMessage<TMessageType>,
  port: Runtime.Port,
  extensionPortName = PORT_EXTENSION
): void => {
  const { id, message, request } = data
  const isExtension = port.name === extensionPortName
  const sender = port.sender as chrome.runtime.MessageSender
  const from = isExtension
    ? "extension"
    : (sender.tab && sender.tab.url) || sender.url || "<unknown>"
  const source = `${from}: ${id}: ${message}`

  // eslint-disable-next-line no-console
  DEBUG && console.debug(`[${port.name} got message from] ${source}`) // :: ${JSON.stringify(request)}`);

  // handle the request and get a promise as a response
  const promise = isExtension
    ? extension.handle(id, message, request, port)
    : tabs.handle(id, message, request, port, from)

  // resolve the promise and send back the response
  promise
    .then((response): void => {
      // eslint-disable-next-line no-console
      DEBUG && console.debug(`[sending message back to] ${source} :: ${JSON.stringify(response)}`)

      // between the start and the end of the promise, the user may have closed
      // the tab, in which case port will be undefined
      assert(port, "Port has been disconnected")

      try {
        port.postMessage({ id, response })
      } catch (e) {
        if (e instanceof Error && e.message === "Attempting to use a disconnected port object") {
          // this means that the user has done something like close the tab
          port.disconnect()
          return
        }
        throw e
      }
    })
    .catch((error: Error): void => {
      // eslint-disable-next-line no-console
      DEBUG && console.debug(`[err] ${source}:: ${error.message}`, { error })

      // only send message back to port if it's still connected
      if (port) {
        try {
          if (error instanceof EthProviderRpcError)
            port.postMessage({
              error: error.message,
              id,
              code: error.code,
              isEthProviderRpcError: true,
            })
          else port.postMessage({ error: error.message, id })
        } catch (caughtError) {
          Sentry.captureException(caughtError, {
            extra: {
              originalError: error,
              info: "Attempt to post error in talismanHandler",
            },
          })
        }
      }
    })
}

export default talismanHandler
