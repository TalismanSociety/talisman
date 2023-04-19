import { log } from "@core/log"
import { logProxy } from "@core/log/logProxy"
import { SendRequest } from "@core/types"

import { getInjectableEvmProvider } from "./getInjectableEvmProvider"

type TalismanWindow = Window &
  typeof globalThis & {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    talismanEth?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    web3?: any
  }

// checking BUILD instead of NODE_ENV because on some dapps we need to test with production builds
const WITH_LOG_PROXY = process.env.BUILD !== "production" && process.env.EVM_LOGPROXY === "true"

export const injectEthereum = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  const provider = getInjectableEvmProvider(sendRequest)

  const talismanEth = WITH_LOG_PROXY ? logProxy(provider) : provider

  log.debug("Injecting talismanEth")
  windowInject.talismanEth = talismanEth

  // also inject on window.ethereum if it is not defined
  // this allows users to just disable metamask if they want to use Talisman instead
  if (windowInject.ethereum === undefined) {
    log.debug("Injecting talismanEth in window.ethereum")

    windowInject.ethereum = talismanEth

    // some dapps (ex moonriver.moonscan.io), still use web3 object send wallet_* messages
    windowInject.web3 = { currentProvider: talismanEth }

    window.dispatchEvent(new Event("ethereum#initialized"))
  } else if (WITH_LOG_PROXY) {
    windowInject.ethereum = logProxy(windowInject.ethereum)
  }
}
