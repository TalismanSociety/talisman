import { log } from "@core/log"
import { logProxy } from "@core/log/logProxy"
import { SendRequest } from "@core/types"
import { EIP6963ProviderInfo, announceProvider } from "mipd"

import { getInjectableEvmProvider } from "./getInjectableEvmProvider"

const providerInfo: EIP6963ProviderInfo = {
  icon: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODIiIGhlaWdodD0iODIiIHZpZXdCb3g9IjAgMCA4MiA4MiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgyIiBoZWlnaHQ9IjgyIiByeD0iMTIiIGZpbGw9IiNENUZGNUMiLz4KPHBhdGggZD0iTTM1LjA0IDU1QzM1LjA0IDU4LjI5MDUgMzcuNjg4NyA2MC45NjIzIDQwLjk3MDMgNjAuOTk5NkM0NC4yNTE5IDYwLjk2MjMgNDYuOTAwNiA1OC4yOTA1IDQ2LjkwMDYgNTVDNDYuOTAwNiA1MS43MDk2IDQ0LjI1MTkgNDkuMDM3NyA0MC45NzAzIDQ5LjAwMDRDMzcuNjg4NyA0OS4wMzc3IDM1LjA0IDUxLjcwOTYgMzUuMDQgNTVaIiBmaWxsPSIjRkQ0ODQ4Ii8+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMjIuODU0NCA0NC42NjIzQzIyLjI0NjIgNDUuOTg2OCAyMC40NTUzIDQ2LjQ1NDYgMTkuNDI0OCA0NS40MjQxTDE3LjUzNTYgNDMuNTM0OUMxNS41ODMgNDEuNTgyMyAxMi40MTcxIDQxLjU4MjMgMTAuNDY0NSA0My41MzQ5QzguNTExODQgNDUuNDg3NSA4LjUxMTg0IDQ4LjY1MzQgMTAuNDY0NSA1MC42MDZMMjUuNzM5MSA2NS44ODA3QzI5LjM5NDIgNzAuMjE3NiAzNC44NTk1IDcyLjk3ODggNDAuOTcwMyA3Mi45OTk0QzQ3LjA4MTEgNzIuOTc4OCA1Mi41NDY0IDcwLjIxNzYgNTYuMjAxNCA2NS44ODA3TDcxLjQ3NjEgNTAuNjA2QzczLjQyODcgNDguNjUzNCA3My40Mjg3IDQ1LjQ4NzUgNzEuNDc2MSA0My41MzQ5QzY5LjUyMzQgNDEuNTgyMyA2Ni4zNTc2IDQxLjU4MjMgNjQuNDA0OSA0My41MzQ5TDYyLjUxNTggNDUuNDI0MUM2MS40ODUyIDQ2LjQ1NDYgNTkuNjk0MyA0NS45ODY4IDU5LjA4NjEgNDQuNjYyM0M1OC45NjYzIDQ0LjQwMTMgNTguOTAxIDQ0LjEyMTMgNTguOTAxIDQzLjgzNDFMNTguOTAxIDIwLjk5OTVDNTguOTAxIDE4LjIzODEgNTYuNjYyNCAxNS45OTk1IDUzLjkwMSAxNS45OTk1QzUxLjEzOTYgMTUuOTk5NSA0OC45MDEgMTguMjM4MSA0OC45MDEgMjAuOTk5NUw0OC45MDEgMzIuNTU2OEM0OC45MDEgMzMuNTUwNiA0Ny44ODI5IDM0LjIyNTIgNDYuOTM1MyAzMy45MjU3QzQ2LjMzNTYgMzMuNzM2MSA0NS45MDIzIDMzLjE5MDEgNDUuOTAyMyAzMi41NjExTDQ1LjkwMjMgMTMuOTk5NkM0NS45MDIzIDExLjI2MDggNDMuNzAwNCA5LjAzNjM3IDQwLjk3MDMgOUMzOC4yNDAyIDkuMDM2MzcgMzYuMDM4MiAxMS4yNjA4IDM2LjAzODIgMTMuOTk5NkwzNi4wMzgyIDMyLjU2MTFDMzYuMDM4MiAzMy4xOTAxIDM1LjYwNSAzMy43MzYxIDM1LjAwNTIgMzMuOTI1N0MzNC4wNTc2IDM0LjIyNTIgMzMuMDM5NSAzMy41NTA2IDMzLjAzOTUgMzIuNTU2OEwzMy4wMzk2IDIwLjk5OTVDMzMuMDM5NiAxOC4yMzgxIDMwLjgwMSAxNS45OTk1IDI4LjAzOTUgMTUuOTk5NUMyNS4yNzgxIDE1Ljk5OTUgMjMuMDM5NSAxOC4yMzgxIDIzLjAzOTUgMjAuOTk5NUwyMy4wMzk1IDQzLjgzNDFDMjMuMDM5NSA0NC4xMjEzIDIyLjk3NDMgNDQuNDAxMyAyMi44NTQ0IDQ0LjY2MjNaTTQwLjk3MDMgNDQuOTk5OUMzMi4xNjU5IDQ1LjA1MjUgMjUuMDQwMyA1NC45OTk3IDI1LjA0MDMgNTQuOTk5N0MyNS4wNDAzIDU0Ljk5OTcgMzIuMTY1OSA2NC45NDY5IDQwLjk3MDMgNjQuOTk5NUM0OS43NzQ2IDY0Ljk0NjkgNTYuOTAwMiA1NC45OTk3IDU2LjkwMDIgNTQuOTk5N0M1Ni45MDAyIDU0Ljk5OTcgNDkuNzc0NiA0NS4wNTI1IDQwLjk3MDMgNDQuOTk5OVoiIGZpbGw9IiNGRDQ4NDgiLz4KPC9zdmc+Cg==",
  name: "Talisman",
  rdns: "xyz.talisman",
  uuid: crypto.randomUUID(),
}

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

    // eip-6963 wallet announcement
    announceProvider({
      info: providerInfo,
      provider: talismanEth,
    })
  } else if (WITH_LOG_PROXY) {
    windowInject.ethereum = logProxy(windowInject.ethereum)
  }
}
