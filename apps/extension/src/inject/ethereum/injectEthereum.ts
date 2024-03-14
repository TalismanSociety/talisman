import { SendRequest } from "@extension/core"
import { log } from "@extension/shared"

import { announceProvider } from "./eip6963"
import { getInjectableEvmProvider } from "./getInjectableEvmProvider"
import { logProxy } from "./logProxy"

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

  // eip-6963 wallet announcement
  announceProvider(talismanEth)

  // also inject on window.ethereum if it is not defined
  // this allows users to just disable metamask if they want to use Talisman instead
  if (windowInject.ethereum === undefined) {
    log.debug("Injecting talismanEth in window.ethereum")

    try {
      // Protect window.ethereum property to workaround Phantom abuse bug
      let currentWindowEthereum = talismanEth
      Object.defineProperty(windowInject, "ethereum", {
        get() {
          return currentWindowEthereum
        },
        set(newValue) {
          // If Talisman is injected before Phantom, Phantom will proxy calls to Talisman if user wants to use Metamask
          // => Prevent Phantom from overriding window.ethereum
          // This may never be called in practice due to Phantom's injection method
          if (newValue.isPhantom)
            throw new Error(
              "Prevent Phantom window.ethereum abuse - see https://github.com/TalismanSociety/talisman/issues/819"
            )

          // allow all other wallets to override window.ethereum
          currentWindowEthereum = newValue
          log.debug("window.ethereum overriden with", { newValue })
        },
        configurable: false,
      })
      log.debug("window.ethereum protected")
    } catch (err) {
      log.error("Failed to define window.ethereum", { err })
      windowInject.ethereum = talismanEth
    }

    // some dapps (ex moonriver.moonscan.io), still use web3 object send wallet_* messages
    windowInject.web3 = { currentProvider: talismanEth }

    window.dispatchEvent(new Event("ethereum#initialized"))
  } else if (WITH_LOG_PROXY) {
    windowInject.ethereum = logProxy(windowInject.ethereum)
  }
}
