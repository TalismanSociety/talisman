import { assert } from "@polkadot/util"
import { PORT_EXTENSION } from "extension-shared"
import { log } from "extension-shared"

import { sentry } from "../config/sentry"
import { TalismanNotOnboardedError } from "../domains/app/utils"
import { cleanupEvmErrorMessage, getEvmErrorCause } from "../domains/ethereum/errors"
import { SitesAuthorizedError } from "../domains/sitesAuthorised/store"
import { MessageTypes, TransportRequestMessage } from "../types"
import { AnyEthRequest } from "../types/domains"
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
  "pri(app.changePassword.subscribe)",
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

const PORT_DISCONNECTED_MESSAGES = [
  "Attempting to use a disconnected port object",
  "Attempt to postMessage on disconnected port",
]

const talismanHandler = <TMessageType extends MessageTypes>(
  data: TransportRequestMessage<TMessageType>,
  port: chrome.runtime.Port,
  extensionPortName = PORT_EXTENSION
): void => {
  const { id, message, request } = data
  const isExtension = port.name === extensionPortName
  const sender = port.sender as chrome.runtime.MessageSender
  const from = isExtension ? "extension" : sender?.url || "<unknown>"
  const source = `${formatFrom(from)}: ${id}: ${
    message === "pub(eth.request)" ? `${message} ${(request as AnyEthRequest).method}` : message
  }`
  const shouldLog = !OBFUSCATE_LOG_MESSAGES.includes(message)

  // eslint-disable-next-line no-console
  log.debug(`[${port.name} REQ] ${source}`, { request: shouldLog ? request : OBFUSCATED_PAYLOAD })

  const safePostMessage = (port: chrome.runtime.Port | undefined, message: unknown): void => {
    // only send message back to port if it's still connected, unfortunately this check is not reliable in all browsers
    if (!port) return

    try {
      port.postMessage(message)
    } catch (e) {
      if (e instanceof Error && PORT_DISCONNECTED_MESSAGES.includes(e.message)) {
        // this means that the user has done something like close the tab
        port.disconnect()
        return
      }
      throw e
    }
  }

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

      safePostMessage(port, { id, response })

      // heap cleanup
      response = null
    })
    .catch((error) => {
      log.error(`[${port.name} ERR] ${source}:: ${error.message}`, { error })

      if (error instanceof Error && PORT_DISCONNECTED_MESSAGES.includes(error.message)) {
        // this means that the user has done something like close the tab
        port.disconnect()
        return
      }

      if (["pub(eth.request)", "pri(eth.request)"].includes(message)) {
        const evmError = getEvmErrorCause(error)
        safePostMessage(port, {
          id,
          error: cleanupEvmErrorMessage(
            (message === "pri(eth.request)" && evmError.details) ||
              (evmError.shortMessage ?? evmError.message ?? "Unknown error")
          ),
          code: error.code,
          rpcData: evmError.data, // don't use "data" as property name or viem will interpret it differently
          isEthProviderRpcError: true,
        })
        return
      }

      // log to sentry because we need to know the traceback
      if (!sentryIgnoreTalismanHandlerError(error)) sentry.captureException(error)
      safePostMessage(port, { id, error: error.message })
    })
    .finally(() => {
      // heap cleanup
      data.request = null
    })
}

/**
 * If any of our handlers throw an error, we will (by default) log that error to sentry.
 *
 * However, there are some errors we expect to see during normal operation.
 * These are errors which the frontend knows to look for and handle appropriately.
 *
 * For example, the error which is thrown when no accounts are authorised for a dapp.
 *
 * This function is used to distinguish between the errors which we don't expect to see,
 * and the errors which we do expect to see - only the latter of which should be logged.
 */
const sentryIgnoreTalismanHandlerError = (error?: unknown): boolean => {
  // ignore (don't log to sentry) these errors
  if (error instanceof TalismanNotOnboardedError) return true
  if (error instanceof SitesAuthorizedError) return true

  // log all other errors
  return false
}

export default talismanHandler
