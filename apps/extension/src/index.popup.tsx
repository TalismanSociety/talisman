import "@core/util/enableLogsInDevelopment"
import "@core/i18nConfig"

import { IS_FIREFOX } from "@core/constants"
import { appStore } from "@core/domains/app"
import { log } from "@core/log"
import { renderTalisman } from "@ui"
import Popup from "@ui/apps/popup"
import Browser from "webextension-polyfill"

const adjustPopupSize = async () => {
  // on embedded popup, zoom is disabled and the frame automatically syncs with the size of content
  if (window.location.search === "?embedded") return

  try {
    const [currentWindow, currentZoom] = await Promise.all([
      Browser.windows.getCurrent(),
      Browser.tabs.getZoom(),
    ])

    // exit if popup is opened in a normal window (common for devs)
    if (currentWindow.type !== "popup") return

    // make sure zoom is reset before adjusting size or size will be incorrect
    // test the necessity to apply the zoom settings, otherwise a zoom update message would appear
    if (currentZoom !== 1) {
      if (IS_FIREFOX) await Browser.tabs.setZoom(1)
      else
        await Browser.tabs.setZoomSettings(undefined, {
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

    if (width !== window.outerWidth || height !== window.outerHeight) {
      Browser.windows.update(Browser.windows.WINDOW_ID_CURRENT, {
        width,
        height,
      })

      // store delta to open next popups at the right size
      await appStore.set({ popupSizeDelta: [deltaWidth, deltaHeight] })
    }
  } catch (err) {
    log.error("Failed to adjust popup size", { err })
  }
}

renderTalisman(<Popup />)
adjustPopupSize()
