import "@common/enableAnyloggerLogsInDevelopment"
import "@common/i18nConfig"

import { appStore } from "@extension/core"
import { log } from "@extension/shared"
import { IS_FIREFOX } from "@extension/shared"
import { renderTalisman } from "@ui"
import Popup from "@ui/apps/popup"

const adjustPopupSize = async () => {
  // on embedded popup, zoom is disabled and the frame automatically syncs with the size of content
  if (window.location.search === "?embedded") return

  try {
    const [currentWindow, currentZoom] = await Promise.all([
      chrome.windows.getCurrent(),
      chrome.tabs.getZoom(),
    ])

    // exit if popup is opened in a normal window (common for devs)
    if (currentWindow.type !== "popup") return

    // make sure zoom is reset before adjusting size or size will be incorrect
    // test the necessity to apply the zoom settings, otherwise a zoom update message would appear
    if (currentZoom !== 1) {
      if (IS_FIREFOX) await chrome.tabs.setZoom(1)
      else
        chrome.tabs.setZoomSettings({
          defaultZoomFactor: 1,
          mode: "disabled",
          scope: "per-tab",
        })
    }

    const { innerHeight, innerWidth, outerHeight, outerWidth } = window

    // check if adjusting the size is needed
    if (innerWidth === 400 && innerHeight === 600) return

    const deltaWidth = outerWidth - innerWidth
    const deltaHeight = outerHeight - innerHeight

    const width = 400 + deltaWidth
    const height = 600 + deltaHeight

    if (!(width > 0 && height > 0))
      throw new Error(`Invalid width (${width}) or height (${height})`)

    if (width !== window.outerWidth || height !== window.outerHeight) {
      chrome.windows.update(chrome.windows.WINDOW_ID_CURRENT, {
        width,
        height,
      })

      // store delta to open next popups at the right size
      await appStore.set({ popupSizeDelta: [deltaWidth, deltaHeight] })
    }
  } catch (cause) {
    log.error("Failed to adjust popup size", { cause })
  }
}

renderTalisman(<Popup />)
adjustPopupSize()
