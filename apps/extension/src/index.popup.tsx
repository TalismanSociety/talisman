import "@core/util/enableLogsInDevelopment"
import "@core/i18nConfig"

import { appStore } from "@core/domains/app"
import { log } from "@core/log"
import { renderTalisman } from "@ui"
import Popup from "@ui/apps/popup"
import Browser from "webextension-polyfill"

const adjustPopupSize = async () => {
  // on embedded popup, zoom is disabled and the frame automatically syncs with the size of content
  if (window.location.search === "?embedded") return

  try {
    const currentZoom = await Browser.tabs.getZoom()

    // make sure zoom is reset before adjusting size or size will be incorrect
    // test the necessity to apply the zoom settings, otherwise a zoom update message would appear
    if (currentZoom !== 1)
      await Browser.tabs.setZoomSettings(undefined, {
        defaultZoomFactor: 1,
        mode: "disabled",
        scope: "per-tab",
      })

    const { innerHeight, innerWidth, outerHeight, outerWidth } = window

    // check if adjusting the size is needed
    if (innerWidth === 400 && innerHeight === 600) return

    const deltaWidth = outerWidth - innerWidth
    const deltaHeight = outerHeight - innerHeight

    if (deltaWidth || deltaHeight) {
      window.resizeTo(400 + deltaWidth, 600 + deltaHeight)

      // store delta to open next popups at the right size
      appStore.set({ popupSizeDelta: [deltaWidth, deltaHeight] })
    }
  } catch (err) {
    log.error("Failed to adjust popup size", { err })
  }
}

renderTalisman(<Popup />)
adjustPopupSize()
