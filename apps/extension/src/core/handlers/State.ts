// Copyright 2019-2021 @polkadot/extension-bg authors & contributors
// SPDX-License-Identifier: Apache-2.0
// Adapted from https://github.com/polkadot-js/extension/packages/extension-base/src/background/handlers/State.ts
import { DEFAULT_ETH_CHAIN_ID } from "@core/constants"
import { appStore } from "@core/domains/app"
import { RequestRoute } from "@core/domains/app/types"
import { EncryptRequestsStore } from "@core/domains/encrypt"
import EthereumNetworksRequestsStore from "@core/domains/ethereum/requestsStore.networks"
import { MetadataRequestsStore } from "@core/domains/metadata"
import { SigningRequestsStore } from "@core/domains/signing"
import { SitesRequestsStore, sitesAuthorisationStore } from "@core/domains/sitesAuthorised"
import EvmWatchAssetRequestsStore from "@core/domains/tokens/evmWatchAssetRequestsStore"
import { isEthereumRequest } from "@core/util/isEthereumRequest"
import { sleep } from "@talismn/util"
import Browser from "webextension-polyfill"

const WINDOW_OPTS: Browser.Windows.CreateCreateDataType = {
  // This is not allowed on FF, only on Chrome - disable completely
  // focused: true,
  height: 630,
  type: "popup",
  url: Browser.runtime.getURL("popup.html"),
  width: 400,
}

export default class State {
  // Prevents opening two onboarding tabs at once
  #onboardingTabOpening = false

  // Request stores handle ephemeral data relating to to requests for signing, metadata, and authorisation of sites
  readonly requestStores = {
    signing: new SigningRequestsStore((req) => {
      this.popupOpen(isEthereumRequest(req) ? `#/sign/eth/${req.id}` : `#/sign/${req.id}`)
    }),
    metadata: new MetadataRequestsStore((req) => {
      this.popupOpen(`#/metadata/${req.id}`)
    }),
    sites: new SitesRequestsStore(
      (req) => {
        this.popupOpen(`#/auth/${req.id}`)
      },
      async (request, response) => {
        if (!response) return
        const { addresses = [] } = response
        const {
          idStr,
          request: { origin, ethereum },
          url,
        } = request

        const siteAuth = (await sitesAuthorisationStore.getSiteFromUrl(url)) ?? {}

        siteAuth.id = idStr
        siteAuth.origin = origin
        siteAuth.url = url

        if (ethereum) {
          siteAuth.ethAddresses = addresses

          // set a default value for ethChainId only if empty
          // some sites switch the network before requesting auth, ex nova.arbiscan.io
          if (!siteAuth.ethChainId) siteAuth.ethChainId = DEFAULT_ETH_CHAIN_ID
        } else siteAuth.addresses = addresses

        await sitesAuthorisationStore.set({
          [idStr]: siteAuth,
        })
      }
    ),
    networks: new EthereumNetworksRequestsStore((req) => {
      this.popupOpen(`#/eth-network-add/${req.id}`)
    }),
    evmAssets: new EvmWatchAssetRequestsStore((req) => {
      this.popupOpen(`#/eth-watchasset/${req.id}`)
    }),
    encrypt: new EncryptRequestsStore((req) => {
      this.popupOpen(`#/encrypt/${req.id}`)
    }),
  }

  #windows: number[] = []

  constructor() {
    // update the icon when any of the request stores change
    Object.values(this.requestStores).forEach((store) => {
      // @ts-ignore
      store.observable.subscribe(() => {
        this.updateIcon(true)
      })
    })
  }

  public promptLogin(closeOnSuccess: boolean): void {
    this.popupOpen(`?closeOnSuccess=${closeOnSuccess}`)
  }

  private popupClose(): void {
    this.#windows.forEach(
      (id: number): void =>
        // eslint-disable-next-line no-void
        void Browser.windows.remove(id)
    )
    this.#windows = []
  }

  public async popupOpen(argument?: string) {
    const currWindow = await Browser.windows.getLastFocused()

    const { left, top } = {
      top: 100 + (currWindow?.top ?? 0),
      left:
        (currWindow?.width ? (currWindow.left ?? 0) + currWindow.width : window.screen.availWidth) -
        410,
    }

    const popup = await Browser.windows.create({
      ...WINDOW_OPTS,
      top,
      left,
      url: Browser.runtime.getURL(`popup.html${argument ? argument : ""}`),
    })

    if (typeof popup?.id !== "undefined") {
      this.#windows.push(popup.id || 0)
      // firefox compatibility (cannot be set at creation)
      if (popup.left !== left && popup.state !== "fullscreen") {
        await Browser.windows.update(popup.id, { left, top })
      }
    }
  }

  private updateIcon(shouldClose?: boolean): void {
    const sitesAuthCount = this.requestStores.sites.getRequestCount()
    const metaCount = this.requestStores.metadata.getRequestCount()
    const signCount = this.requestStores.signing.getRequestCount()
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
      this.popupClose()
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

  public async openOnboarding() {
    if (this.#onboardingTabOpening) return
    this.#onboardingTabOpening = true
    const url = Browser.runtime.getURL(`onboarding.html`)

    const onboarded = await appStore.getIsOnboarded()

    await this.openTabOnce({ url, shouldFocus: onboarded })
    this.#onboardingTabOpening = false
  }

  public async openDashboard({ route }: RequestRoute) {
    const baseUrl = Browser.runtime.getURL("dashboard.html")

    await this.openTabOnce({ url: `${baseUrl}#${route}`, baseUrl })

    return true
  }
}
