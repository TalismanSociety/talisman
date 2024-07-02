import { sleep } from "@talismn/util"
import { IS_FIREFOX } from "extension-shared"
import { log } from "extension-shared"

import { appStore } from "../domains/app/store.app"
import { RequestRoute } from "../domains/app/types"

const WINDOW_OPTS: chrome.windows.CreateData & { width: number; height: number } = {
  type: "popup",
  url: chrome.runtime.getURL("popup.html"),
  width: 400,
  height: 600,
}

class WindowManager {
  #windows: number[] = []
  // Prevents opening two onboarding tabs at once
  #onboardingTabOpening = false
  // Prevents opening two login popups at once
  #isLoginPromptOpen = false

  private waitTabLoaded = (tabId: number): Promise<void> => {
    // wait either page to be loaded or a 3 seconds timeout, first to occur wins
    // this is to handle edge cases where page is closed or breaks before loading
    return Promise.race<void>([
      //promise that waits for page to be loaded
      new Promise((resolve) => {
        const handler = (id: number, changeInfo: chrome.tabs.TabChangeInfo) => {
          if (id !== tabId) return
          if (changeInfo.status === "complete") {
            // dispose of the listener to prevent a memory leak
            chrome.tabs.onUpdated.removeListener(handler)
            resolve()
          }
        }
        chrome.tabs.onUpdated.addListener(handler)
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
  }): Promise<chrome.tabs.Tab> {
    const queryUrl = baseUrl ?? url

    let [tab] = await chrome.tabs.query({ url: queryUrl })

    if (tab?.id) {
      const options: chrome.tabs.UpdateProperties = { active: shouldFocus }
      if (url !== tab.url) options.url = url
      const { windowId } = await chrome.tabs.update(tab.id, options)

      if (shouldFocus && windowId) {
        const { focused } = await chrome.windows.get(windowId)
        if (!focused) await chrome.windows.update(windowId, { focused: true })
      }
    } else {
      tab = await chrome.tabs.create({ url })
    }

    // wait for page to be loaded if it isn't
    if (tab.status === "loading") await this.waitTabLoaded(tab.id as number)
    return tab
  }

  public async openOnboarding(route?: string) {
    if (this.#onboardingTabOpening) return
    this.#onboardingTabOpening = true
    const baseUrl = chrome.runtime.getURL(`onboarding.html`)

    const onboarded = await appStore.getIsOnboarded()

    await this.openTabOnce({
      url: `${baseUrl}${route ? `#${route}` : ""}`,
      baseUrl,
      shouldFocus: onboarded,
    })
    this.#onboardingTabOpening = false
  }

  public async openDashboard({ route }: RequestRoute) {
    const baseUrl = chrome.runtime.getURL("dashboard.html")

    await this.openTabOnce({ url: `${baseUrl}#${route}`, baseUrl })

    return true
  }

  async popupClose(id?: number) {
    if (id) {
      await chrome.windows.remove(id)
      this.#windows = this.#windows.filter((wid) => wid !== id)
    } else {
      await Promise.all(this.#windows.map((wid) => chrome.windows.remove(wid)))
      this.#windows = []
    }
  }

  async popupOpen(argument?: string, onClose?: () => void) {
    const currWindow = await chrome.windows.getLastFocused()
    const [widthDelta, heightDelta] = await appStore.get("popupSizeDelta")

    const { left, top } = {
      top: 100 + (currWindow?.top ?? 0),
      left: currWindow?.width ? (currWindow.left ?? 0) + currWindow.width - 500 : 500,
    }

    const popupCreateArgs: chrome.windows.CreateData = {
      ...WINDOW_OPTS,
      url: chrome.runtime.getURL(`popup.html${argument ?? ""}`),
      top,
      left,
      width: WINDOW_OPTS.width + widthDelta,
      height: WINDOW_OPTS.height + heightDelta,
    }

    let popup: chrome.windows.Window
    try {
      popup = await chrome.windows.create(popupCreateArgs)
    } catch (err) {
      log.error("Failed to open popup", err)

      // retry with default size, as an invalid size could be the source of the error
      popup = await chrome.windows.create({
        ...popupCreateArgs,
        width: WINDOW_OPTS.width,
        height: WINDOW_OPTS.height,
      })
    }

    if (typeof popup?.id !== "undefined") {
      this.#windows.push(popup.id || 0)
      // firefox compatibility (cannot be set at creation)
      if (IS_FIREFOX && popup.left !== left && popup.state !== "fullscreen") {
        await chrome.windows.update(popup.id, { left, top })
      }
    }

    if (onClose) {
      chrome.windows.onRemoved.addListener((id) => {
        if (id === popup.id) {
          this.#windows = this.#windows.filter((wid) => wid !== id)
          onClose()
        }
      })
    }

    // popup is undefined when running tests
    return popup?.id
  }

  public async promptLogin() {
    if (this.#isLoginPromptOpen) return false

    this.#isLoginPromptOpen = true

    await windowManager.popupOpen(`?closeAfterLogin=true`, () => {
      this.#isLoginPromptOpen = false
    })

    return true
  }
}

export const windowManager = new WindowManager()
