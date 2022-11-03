import { log } from "@core/log"
import { logProxy } from "@core/log/logProxy"
import { SendRequest } from "@core/types"
import { TalismanEthProvider } from "./TalismanEthProvider"

type TalismanWindow = Window &
  typeof globalThis & {
    ethereum: any
    talismanEth?: TalismanEthProvider
  }

export const injectEthereum = (sendRequest: SendRequest) => {
  // small helper with the typescript types, just cast window
  const windowInject = window as TalismanWindow

  // inject ethereum wallet provider
  windowInject.talismanEth = new TalismanEthProvider(sendRequest)

  // also inject on window.ethereum if it is not defined
  // this allows users to just disable metamask if they want to use Talisman instead
  if (typeof windowInject.ethereum === "undefined") {
    log.log("Injecting talismanEth in window.ethereum")
    windowInject.ethereum = windowInject.talismanEth
  }

  // checking BUILD instead of NODE_ENV because on some dapps we need to test with production builds
  if (process.env.BUILD !== "production" && process.env.EVM_LOGPROXY === "true") {
    log.log("logProxy", windowInject.ethereum.isTalisman ? "Talisman" : "MetaMask")
    windowInject.ethereum = logProxy(windowInject.ethereum)
  }
}
