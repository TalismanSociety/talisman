import { log } from "@core/log"
import { logProxy } from "@core/log/logProxy"
import { SendRequest } from "@core/types"

import { getInjectableEvmProvider } from "./getInjectableEvmProvider"

type TalismanWindow = Window &
  typeof globalThis & {
    ethereum: any
    talismanEth?: any
  }

// checking BUILD instead of NODE_ENV because on some dapps we need to test with production builds
const WITH_LOG_PROXY = process.env.BUILD !== "production" && process.env.EVM_LOGPROXY === "true"

export const injectEthereum = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  const provider = getInjectableEvmProvider(sendRequest)

  log.debug("Injecting talismanEth")
  windowInject.talismanEth = WITH_LOG_PROXY ? logProxy(provider) : provider

  // also inject on window.ethereum if it is not defined
  // this allows users to just disable metamask if they want to use Talisman instead
  if (windowInject.ethereum === undefined) {
    log.debug("Injecting talismanEth in window.ethereum")

    windowInject.ethereum = provider

    // some dapps (ex moonriver.moonscan.io), still use web3 object send wallet_* messages
    Object.defineProperty(window, "web3", {
      value: { currentProvider: provider },
      enumerable: false,
      configurable: true,
      writable: true,
    })

    window.dispatchEvent(new Event("ethereum#initialized"))
  } else if (WITH_LOG_PROXY) {
    windowInject.ethereum = logProxy(windowInject.ethereum)
  }
}
