import "@core/util/enableLogsInDevelopment"
import "@core/i18nConfig"

import { log } from "@core/log"
import { renderTalisman } from "@ui"
import Popup from "@ui/apps/popup"
import Browser from "webextension-polyfill"

// append a class on root HTML element if popup was opened from extension button
if (window.location.search === "?embedded") document.documentElement.classList.add("embedded")

// reset zoom level to ensure content fits in popup window
Browser.tabs
  .getZoom()
  .then((zoom) => {
    if (zoom !== 1) Browser.tabs.setZoom(undefined, 1).catch(log.error)
  })
  .catch(log.error)

renderTalisman(<Popup />)
