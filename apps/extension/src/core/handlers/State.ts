import { DEFAULT_ETH_CHAIN_ID } from "@core/constants"
// Copyright 2019-2021 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Adapted from https://github.com/polkadot-js/extension/packages/extension-base/src/background/handlers/State.ts
import { appStore } from "@core/domains/app"
import { RequestRoute } from "@core/domains/app/types"
import { EncryptRequestsStore } from "@core/domains/encrypt"
import EthereumNetworksRequestsStore from "@core/domains/ethereum/requestsStore.networks"
import { MetadataRequestsStore } from "@core/domains/metadata"
import EvmWatchAssetRequestsStore from "@core/domains/tokens/evmWatchAssetRequestsStore"
import { requestStore } from "@core/libs/requests/store"
import { windowManager } from "@core/libs/WindowManager"
import { sleep } from "@talismn/util"
import Browser from "webextension-polyfill"

export default class State {
  // Prevents opening two onboarding tabs at once
  #onboardingTabOpening = false

  // Request stores handle ephemeral data relating to to requests for signing, metadata, and authorisation of sites
  readonly requestStores = {
    metadata: new MetadataRequestsStore((req) => {
      windowManager.popupOpen(`#/metadata/${req.id}`)
    }),
    networks: new EthereumNetworksRequestsStore((req) => {
      windowManager.popupOpen(`#/eth-network-add/${req.id}`)
    }),
    evmAssets: new EvmWatchAssetRequestsStore((req) => {
      windowManager.popupOpen(`#/eth-watchasset/${req.id}`)
    }),
    encrypt: new EncryptRequestsStore((req) => {
      windowManager.popupOpen(`#/encrypt/${req.id}`)
    }),
  }

  constructor() {
    // update the icon when any of the request stores change
    requestStore.observable.subscribe(() => this.updateIcon(true))
  }

  public promptLogin(closeOnSuccess: boolean): void {
    windowManager.popupOpen(`?closeOnSuccess=${closeOnSuccess}`)
  }

  private updateIcon(shouldClose?: boolean): void {
    const sitesAuthCount = requestStore.getRequestCount(["auth"])
    const metaCount = this.requestStores.metadata.getRequestCount()
    const signCount = requestStore.getRequestCount(["eth-send", "eth-sign", "substrate-sign"])
    const networkAddCount = this.requestStores.networks.getRequestCount()
    const evmAssets = this.requestStores.evmAssets.getRequestCount()
    const text = sitesAuthCount
      ? "Sites"
      : metaCount
      ? "Meta"
      : signCount
      ? `${signCount}`
      : networkAddCount
      ? "Network"
      : evmAssets
      ? "Assets"
      : ""

    Browser.browserAction.setBadgeText({ text })

    if (shouldClose && text === "") {
      windowManager.popupClose()
    }
  }

  private waitTabLoaded = (tabId: number): Promise<void> => {
    // wait either page to be loaded or a 3 seconds timeout, first to occur wins
    // this is to handle edge cases where page is closed or breaks before loading
    return Promise.race<void>([
      //promise that waits for page to be loaded
      new Promise((resolve) => {
        const handler = (id: number, changeInfo: Browser.Tabs.OnUpdatedChangeInfoType) => {
          if (id !== tabId) return
          if (changeInfo.status === "complete") {
            // dispose of the listener to prevent a memory leak
            Browser.tabs.onUpdated.removeListener(handler)
            resolve()
          }
        }
        Browser.tabs.onUpdated.addListener(handler)
      }),
      // promise for the timeout
      sleep(3000),
    ])
  }

  /**
   * Creates a new tab for a url if it isn't already open, or else focuses the existing tab if it is.
   *
   * @param url: The full url including # path or route that should be used to create the tab if it doesn't exist
   * @param baseUrl: Optional, the base url (eg 'chrome-extension://idgkbaeeleekhpeoakcbpbcncikdhboc/dashboard.html') without the # path
   *
   */
  private async openTabOnce({
    url,
    baseUrl,
    shouldFocus = true,
  }: {
    url: string
    baseUrl?: string
    shouldFocus?: boolean
  }): Promise<Browser.Tabs.Tab> {
    const queryUrl = baseUrl ?? url

    let [tab] = await Browser.tabs.query({ url: queryUrl })

    if (tab) {
      const options: Browser.Tabs.UpdateUpdatePropertiesType = { active: shouldFocus }
      if (url !== tab.url) options.url = url
      const { windowId } = await Browser.tabs.update(tab.id, options)

      if (shouldFocus && windowId) {
        const { focused } = await Browser.windows.get(windowId)
        if (!focused) await Browser.windows.update(windowId, { focused: true })
      }
    } else {
      tab = await Browser.tabs.create({ url })
    }

    // wait for page to be loaded if it isn't
    if (tab.status === "loading") await this.waitTabLoaded(tab.id as number)
    return tab
  }

  public async openOnboarding(route?: string) {
    if (this.#onboardingTabOpening) return
    this.#onboardingTabOpening = true
    const baseUrl = Browser.runtime.getURL(`onboarding.html`)

    const onboarded = await appStore.getIsOnboarded()

    await this.openTabOnce({
      url: `${baseUrl}${route ? `#${route}` : ""}`,
      baseUrl,
      shouldFocus: onboarded,
    })
    this.#onboardingTabOpening = false
  }

  public async openDashboard({ route }: RequestRoute) {
    const baseUrl = Browser.runtime.getURL("dashboard.html")

    await this.openTabOnce({ url: `${baseUrl}#${route}`, baseUrl })

    return true
  }
}
