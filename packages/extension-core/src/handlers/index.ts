import { assert } from "@polkadot/util"
import { PORT_EXTENSION } from "extension-shared"
import { log } from "extension-shared"
import { Runtime } from "webextension-polyfill"

import { cleanupEvmErrorMessage, getEvmErrorCause } from "../domains/ethereum/errors"
import { AnyEthRequest } from "../injectEth/types"
import { MessageTypes, TransportRequestMessage } from "../types"
import Extension from "./Extension"
import { extensionStores, tabStores } from "./stores"
import Tabs from "./Tabs"

const extension = new Extension(extensionStores)
const tabs = new Tabs(tabStores)

// dev mode logs shouldn't log content for these messages
const OBFUSCATE_LOG_MESSAGES: MessageTypes[] = [
  "pri(app.authenticate)",
  "pri(app.checkPassword)",
  "pri(app.changePassword)",
  "pri(accounts.export)",
  "pri(accounts.export.pk)",
  "pri(accounts.create)",
  "pri(accounts.create.suri)",
  "pri(accounts.create.json)",
  "pri(accounts.address.lookup)",
  "pri(app.onboardCreatePassword)",
  "pri(mnemonic.setVerifierCertMnemonic)",
  "pri(mnemonic.unlock)",
  "pri(mnemonic.validateMnemonic)",
]
const OBFUSCATED_PAYLOAD = "#OBFUSCATED#"

const formatFrom = (source: string) => {
  if (["extension", "<unknown>"].includes(source)) return source
  if (!source) return source
  try {
    const urlObj = new URL(source)
    return urlObj?.host
  } catch (err) {
    return source
  }
}

const talismanHandler = <TMessageType extends MessageTypes>(
  data: TransportRequestMessage<TMessageType>,
  port: Runtime.Port,
  extensionPortName = PORT_EXTENSION
): void => {
  const { id, message, request } = data
  const isExtension = port.name === extensionPortName
  const sender = port.sender as chrome.runtime.MessageSender
  const from = isExtension ? "extension" : sender?.tab?.url || "<unknown>"
  const source = `${formatFrom(from)}: ${id}: ${
    message === "pub(eth.request)" ? `${message} ${(request as AnyEthRequest).method}` : message
  }`
  const shouldLog = !OBFUSCATE_LOG_MESSAGES.includes(message)

  // eslint-disable-next-line no-console
  log.debug(`[${port.name} REQ] ${source}`, { request: shouldLog ? request : OBFUSCATED_PAYLOAD })

  // handle the request and get a promise as a response
  const promise = isExtension
    ? extension.handle(id, message, request, port)
    : tabs.handle(id, message, request, port, from)

  // resolve the promise and send back the response
  promise
    .then((response): void => {
      log.debug(`[${port.name} RES] ${source}`, {
        request: shouldLog ? request : OBFUSCATED_PAYLOAD,
        response: shouldLog ? response : OBFUSCATED_PAYLOAD,
      })

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

      // heap cleanup
      response = null
    })
    .catch((error) => {
      log.error(`[${port.name} ERR] ${source}:: ${error.message}`, { error })

      if (
        error instanceof Error &&
        error.message === "Attempting to use a disconnected port object"
      ) {
        // this means that the user has done something like close the tab
        port.disconnect()
        return
      }

      // only send message back to port if it's still connected, unfortunately this check is not reliable in all browsers
      if (port) {
        try {
          if (["pub(eth.request)", "pri(eth.request)"].includes(message)) {
            const evmError = getEvmErrorCause(error)
            port.postMessage({
              id,
              error: cleanupEvmErrorMessage(
                (message === "pri(eth.request)" && evmError.details) ||
                  (evmError.shortMessage ?? evmError.message ?? "Unknown error")
              ),
              code: error.code,
              rpcData: evmError.data, // don't use "data" as property name or viem will interpret it differently
              isEthProviderRpcError: true,
            })
          } else port.postMessage({ id, error: error.message })
        } catch (caughtError) {
          /**
           * no-op
           * caughtError will be `Attempt to postMessage on disconnected port`
           * The original errors themselves are mostly intentionally thrown as control flow for dapp connections, so logging them creates noise
           *  */
        }
      }
    })
    .finally(() => {
      // heap cleanup
      data.request = null
    })
}

export default talismanHandler
