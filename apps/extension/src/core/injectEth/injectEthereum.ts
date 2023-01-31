import { log } from "@core/log"
import { logProxy } from "@core/log/logProxy"
import { SendRequest } from "@core/types"

import { getInjectableEvmProvider } from "./getInjectableEvmProvider"

type TalismanWindow = Window &
  typeof globalThis & {
    ethereum: any
    talismanEth?: any
  }

export const injectEthereum = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  const provider = getInjectableEvmProvider(sendRequest)

  log.debug("Injecting talismanEth")
  windowInject.talismanEth = provider

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
  }

  // checking BUILD instead of NODE_ENV because on some dapps we need to test with production builds
  if (process.env.BUILD !== "production" && process.env.EVM_LOGPROXY === "true") {
    log.debug("logProxy", windowInject.ethereum.isTalisman ? "Talisman" : "MetaMask")
    windowInject.ethereum = logProxy(windowInject.ethereum)
  }
}
